/**
 * useUserRelationship.js
 * Realtime hook to compute relationship status between currentUserId and targetUserId.
 *
 * Status enum:
 *   'self'             — targetUser is currentUser
 *   'loading'          — still fetching
 *   'none'             — no connection
 *   'pending_sent'     — currentUser sent request, not yet accepted
 *   'pending_received' — targetUser sent request to currentUser
 *   'connected'        — dmRequest.status === 'accepted'
 *   'disconnected'     — previously connected, now disconnected
 *   'blocked_by_me'    — currentUser has blocked targetUser
 *   'blocked_by_them'  — targetUser has blocked currentUser
 *
 * Source of truth (per spec):
 *   1. dmRequests.status === 'accepted'  → connected
 *   2. conversations (participantIds)    → fallback only
 *   3. blockedUsers/{uid}/blocked/{targetUid} → block source of truth
 */
import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot, doc,
} from 'firebase/firestore';
import { db } from '../firebase.js';

/**
 * @param {string|null} currentUserId
 * @param {string|null} targetUserId
 * @returns {{
 *   status: string,
 *   existingConv: object|null,
 *   pendingReqId: string|null,
 *   incomingReq: object|null,
 *   loading: boolean,
 * }}
 */
export function useUserRelationship(currentUserId, targetUserId) {
  const [status, setStatus]       = useState('loading');
  const [existingConv, setExistingConv] = useState(null);
  const [pendingReqId, setPendingReqId] = useState(null);
  const [incomingReq, setIncomingReq]   = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!currentUserId || !targetUserId) {
      setStatus('none');
      setLoading(false);
      return;
    }
    if (currentUserId === targetUserId) {
      setStatus('self');
      setLoading(false);
      return;
    }

    let unsubBlock1, unsubBlock2, unsubReqsSent, unsubReqsReceived, unsubConvs;
    let blockByMe   = false;
    let blockByThem = false;
    let sentReq     = null;   // { id, status }
    let receivedReq = null;   // { id, ...data }
    let conv        = null;   // conversation object

    const recompute = () => {
      if (blockByMe) {
        setStatus('blocked_by_me');
        setLoading(false);
        return;
      }
      if (blockByThem) {
        setStatus('blocked_by_them');
        setLoading(false);
        return;
      }
      // Check accepted/disconnected via dmRequests (primary source)
      if (sentReq?.status === 'accepted') {
        setStatus('connected');
        setExistingConv(conv);
        setLoading(false);
        return;
      }
      if (receivedReq?.status === 'accepted') {
        setStatus('connected');
        setExistingConv(conv);
        setLoading(false);
        return;
      }
      if (sentReq?.status === 'disconnected' || receivedReq?.status === 'disconnected') {
        setStatus('disconnected');
        setExistingConv(conv);
        setLoading(false);
        return;
      }
      if (sentReq?.status === 'pending') {
        setStatus('pending_sent');
        setPendingReqId(sentReq.id);
        setLoading(false);
        return;
      }
      if (receivedReq?.status === 'pending') {
        setStatus('pending_received');
        setIncomingReq(receivedReq);
        setLoading(false);
        return;
      }
      // Fallback: conversation exists without accepted dmRequest
      if (conv) {
        setStatus('connected');
        setExistingConv(conv);
        setLoading(false);
        return;
      }
      setStatus('none');
      setExistingConv(null);
      setPendingReqId(null);
      setIncomingReq(null);
      setLoading(false);
    };

    // 1. Block: blockedUsers/{currentUserId}/blocked/{targetUserId}
    try {
      unsubBlock1 = onSnapshot(
        doc(db, 'blockedUsers', currentUserId, 'blocked', targetUserId),
        snap => { blockByMe = snap.exists(); recompute(); },
        () => { blockByMe = false; recompute(); }
      );
      unsubBlock2 = onSnapshot(
        doc(db, 'blockedUsers', targetUserId, 'blocked', currentUserId),
        snap => { blockByThem = snap.exists(); recompute(); },
        () => { blockByThem = false; recompute(); }
      );
    } catch { /* permission denied — treat as no block */ }

    // 2. DM requests I sent
    unsubReqsSent = onSnapshot(
      query(
        collection(db, 'dmRequests'),
        where('fromUserId', '==', currentUserId),
        where('toUserId',   '==', targetUserId),
      ),
      snap => {
        // Pick latest by createdAt (descending)
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const sorted = docs.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        sentReq = sorted[0] ?? null;
        recompute();
      },
      () => { sentReq = null; recompute(); }
    );

    // 3. DM requests they sent to me
    unsubReqsReceived = onSnapshot(
      query(
        collection(db, 'dmRequests'),
        where('fromUserId', '==', targetUserId),
        where('toUserId',   '==', currentUserId),
      ),
      snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const sorted = docs.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        receivedReq = sorted[0] ?? null;
        setIncomingReq(receivedReq);
        recompute();
      },
      () => { receivedReq = null; recompute(); }
    );

    // 4. Conversations (fallback)
    unsubConvs = onSnapshot(
      query(
        collection(db, 'conversations'),
        where('participantIds', 'array-contains', currentUserId),
      ),
      snap => {
        const match = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .find(c => c.participantIds?.includes(targetUserId));
        conv = match ?? null;
        setExistingConv(conv);
        recompute();
      },
      () => { conv = null; recompute(); }
    );

    return () => {
      unsubBlock1?.();
      unsubBlock2?.();
      unsubReqsSent?.();
      unsubReqsReceived?.();
      unsubConvs?.();
    };
  }, [currentUserId, targetUserId]);

  return { status, existingConv, pendingReqId, incomingReq, loading };
}
