/**
 * Resolves a distinct knowledge article from community post message data.
 * Checks for knowledgeArticle, knowledgeArticleSuggestion, and linkedKnowledgeArticle.
 * Avoids duplication if the article content is identical to the post's text or title.
 * 
 * @param {Object} msg - The community post message.
 * @returns {Object|null} Mapped distinct article object, or null if duplicate or missing.
 */
export function getDistinctKnowledgeArticle(msg) {
  if (!msg) return null;
  
  // Resolve raw article from supported fields
  const rawArticle = msg.knowledgeArticle || msg.knowledgeArticleSuggestion || msg.linkedKnowledgeArticle;
  
  if (!rawArticle || !rawArticle.title?.trim() || !rawArticle.body?.trim()) {
    return null;
  }
  
  const articleTitle = rawArticle.title.trim();
  const articleBody = rawArticle.body.trim();
  
  const postTitle = (msg.title || '').trim();
  const postText = (msg.text || '').trim();
  
  // Deduplication check: make sure the article body is not identical/duplicated in the post text
  if (articleBody === postText || postText.includes(articleBody)) {
    return null;
  }
  
  if (articleTitle === postTitle && postTitle !== '') {
    return null;
  }
  
  return {
    title: articleTitle,
    summary: (rawArticle.summary || '').trim(),
    body: articleBody,
    keyPoints: Array.isArray(rawArticle.keyPoints) ? rawArticle.keyPoints : [],
    todayAction: (rawArticle.todayAction || '').trim(),
    tags: Array.isArray(rawArticle.tags) ? rawArticle.tags : [],
    imageUrl: rawArticle.imageUrl || '',
    librarySection: rawArticle.librarySection || '',
    transparencyLabel: rawArticle.transparencyLabel || ''
  };
}
