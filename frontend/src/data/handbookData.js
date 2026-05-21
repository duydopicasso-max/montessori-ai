/**
 * handbookData.js
 * Cẩm nang kiến thức phát triển Mẹ & Bé theo tuần thai và ngày tuổi thực tế.
 * Tích hợp phương pháp giáo dục sớm Montessori và chuẩn WHO Việt Nam.
 */

// ── DỮ LIỆU THAI KỲ (Tuần 1 - 42) ──
export const PREGNANCY_MILESTONES = {
  1: {
    title: "Giai đoạn thụ tinh",
    desc: "Cơ thể mẹ đang chuẩn bị rụng trứng. Trứng thụ tinh sẽ di chuyển xuống tử cung.",
    tip: "Mẹ nên tiếp tục bổ sung Acid Folic 400mcg mỗi ngày và tránh tiếp xúc với hóa chất độc hại."
  },
  4: {
    title: "Phôi thai bắt đầu làm tổ",
    desc: "Phôi thai nhỏ bằng hạt vừng đã làm tổ chắc chắn trong tử cung. Các tế bào đang phân chia thần tốc.",
    tip: "Mẹ có thể thử thai bằng que và bắt đầu cảm thấy căng ngực, mệt mỏi nhẹ."
  },
  8: {
    title: "Tim thai bắt đầu đập",
    desc: "Bé đã lớn bằng quả mâm xôi. Các cơ quan quan trọng như tim, não, phổi đang hình thành và tim thai đã đập nhịp nhàng.",
    tip: "Hãy đặt lịch khám thai đầu tiên để bác sĩ siêu âm kiểm tra tim thai và vị trí phôi nhé."
  },
  12: {
    title: "Hoàn thiện cấu trúc cơ bản",
    desc: "Bé lớn bằng quả chanh ta. Bé đã có đầy đủ ngón tay, ngón chân và có thể cử động nhẹ trong bọc ối.",
    tip: "Hoàn thành mốc kiểm tra độ mờ da gáy (tuần 11-13) để sàng lọc dị tật bẩm sinh quan trọng."
  },
  16: {
    title: "Bé biết nghe nhịp tim của mẹ",
    desc: "Bé lớn bằng quả bơ. Hệ xương đang cứng cáp hơn và bé đã bắt đầu nghe được âm thanh từ nhịp tim, mạch máu của mẹ.",
    tip: "Đây là thời điểm tuyệt vời để bắt đầu thai giáo bằng âm nhạc nhẹ nhàng và trò chuyện cùng con."
  },
  20: {
    title: "Thời kỳ máy thai rõ rệt",
    desc: "Bé có kích thước bằng quả chuối. Da bé được bao phủ bởi chất gây (vernix) bảo vệ. Bé đã nhào lộn tích cực và mẹ có thể cảm nhận được cú máy thai rõ rệt.",
    tip: "Hãy cùng bố đặt tay lên bụng để cảm nhận cử động của con. Điều này giúp gắn kết tình cảm gia đình."
  },
  24: {
    title: "Phổi bé bắt đầu sản xuất chất diện hoạt",
    desc: "Bé lớn bằng quả dừa. Phổi đang phát triển các phế nang. Bé có thể mở mắt và phản ứng mạnh với ánh sáng chiếu lên bụng mẹ.",
    tip: "Mẹ chuẩn bị làm xét nghiệm dung nạp đường huyết (tuần 24-28) để tầm soát tiểu đường thai kỳ."
  },
  28: {
    title: "Bắt đầu tam cá nguyệt thứ 3",
    desc: "Bé nặng khoảng 1kg, lớn bằng cây súp lơ. Não bộ phát triển thần tốc với hàng tỷ tế bào thần kinh mới hình thành.",
    tip: "Mẹ nên đếm cử động thai (máy thai) hàng ngày sau các bữa ăn. Bé máy ít nhất 4 lần trong 1 giờ là an toàn."
  },
  32: {
    title: "Bé quay đầu xuống dưới (Ngôi thuận)",
    desc: "Bé nặng khoảng 1.7kg, lớn bằng quả dưa hấu lớn. Đa số các bé đã tự quay đầu xuống để chuẩn bị cho kỳ sinh nở sắp tới.",
    tip: "Mẹ chú ý bổ sung đủ Canxi và sắt vì đây là giai đoạn bé rút nhiều dưỡng chất nhất để hoàn thiện hệ xương."
  },
  36: {
    title: "Hoàn thiện phổi và hệ miễn dịch",
    desc: "Bé nặng khoảng 2.6kg, lớn bằng cây xà lách lớn. Phổi đã gần như hoàn thiện hoàn toàn và sẵn sàng tự thở khi chào đời.",
    tip: "Mẹ chuẩn bị sẵn giỏ đồ đi sinh, tìm hiểu các dấu hiệu chuyển dạ (đau bụng từng cơn, rỉ ối, ra máu báo)."
  },
  40: {
    title: "Bé sẵn sàng chào đời!",
    desc: "Bé đã phát triển đầy đủ và có thể chào đời bất cứ lúc nào. Bé đang cuộn tròn chờ đợi tín hiệu chuyển dạ từ cơ thể mẹ.",
    tip: "Giữ tinh thần thoải mái, đi bộ nhẹ nhàng. Nếu quá ngày dự kiến sinh 1 tuần, hãy nhập viện theo dõi sát sao."
  }
};

// ── DỮ LIỆU TRẺ SƠ SINH & EM BÉ (Tháng 0 - 36+) ──
export const BABY_MILESTONES = [
  {
    monthStart: 0,
    monthEnd: 1,
    title: "Làm quen với thế giới mới 🌿",
    desc: "Bé chủ yếu ngủ, bú và khóc để giao tiếp. Bé chỉ nhìn rõ trong khoảng cách 20-30cm (khoảng cách từ mắt bé đến mặt mẹ khi bú).",
    milestone: "Bé có thể giật mình trước âm thanh lớn (phản xạ Moro), biết nhìn chăm chú vào khuôn mặt mẹ.",
    montessori: "Tránh kích thích quá mức. Sử dụng bộ tranh đen trắng kích thích thị giác đặt cách mắt bé 25cm. Trò chuyện nhẹ nhàng khi thay tã."
  },
  {
    monthStart: 1,
    monthEnd: 2,
    title: "Nụ cười xã hội đầu tiên 😊",
    desc: "Bé bắt đầu biết thức lâu hơn và thích ngắm nhìn xung quanh. Bé nhạy cảm hơn với âm thanh phát ra từ đồ vật.",
    milestone: "Ngẩng đầu nhẹ khi nằm sấp (tummy time). Biết nở nụ cười đáp lại khi mẹ cưng nựng.",
    montessori: "Tập tummy time 2-3 phút mỗi ngày trên thảm mềm. Cho bé nghe nhạc kalimba hoặc âm thanh tự nhiên nhẹ nhàng để thư giãn."
  },
  {
    monthStart: 2,
    monthEnd: 3,
    title: "Khám phá đôi bàn tay 🙌",
    desc: "Bé bắt đầu phát hiện ra mình có hai bàn tay. Bé thích xòe tay, nhìn ngắm ngón tay và đưa tay vào miệng.",
    milestone: "Biết phát ra các âm điệu ríu rít ê, a (bập bẹ). Đầu giữ khá vững khi được bế dựng.",
    montessori: "Treo các đồ chơi di động Montessori (như Munari hoặc Gobbi) phía trên ngực bé để kích thích sự tập trung quan sát thị giác."
  },
  {
    monthStart: 3,
    monthEnd: 4,
    title: "Bắt đầu tập lẫy (lật) 🤸",
    desc: "Hệ cơ cổ và lưng của bé đã cứng cáp hơn nhiều. Bé thích lật người từ nằm ngửa sang nằm sấp.",
    milestone: "Biết dùng hai tay chống đỡ ngực cao lên khi nằm sấp. Bắt đầu có thể lật nghiêng hoặc lẫy thành công.",
    montessori: "Đặt bé nằm trên một tấm gương an toàn bên cạnh thảm chơi để bé ngắm nhìn cử động của mình. Khuyến khích bé tự với lấy đồ chơi gỗ nhẹ."
  },
  {
    monthStart: 4,
    monthEnd: 5,
    title: "Phát triển xúc giác mạnh mẽ 🖐️",
    desc: "Bé muốn chạm và nắm lấy tất cả những gì trong tầm mắt. Bé thích đưa mọi đồ vật vào miệng để khám phá kết cấu.",
    milestone: "Với tay chính xác hơn để chụp lấy đồ chơi. Biết tự chuyển đồ chơi từ tay này sang tay kia.",
    montessori: "Cung cấp các vòng ngậm nướu bằng gỗ tự nhiên sạch, bóng vải Montessori có các múi cầm để luyện kỹ năng cầm nắm phối hợp 2 tay."
  },
  {
    monthStart: 5,
    monthEnd: 6,
    title: "Chuẩn bị ngồi vững và ăn dặm 🥑",
    desc: "Hệ tiêu hóa của bé chuẩn bị sẵn sàng cho thức ăn đặc. Bé vô cùng tò mò khi nhìn thấy người lớn ăn uống.",
    milestone: "Tự lật sấp ngửa nhuần nhuyễn. Có thể ngồi tựa lưng vững vàng trong vài phút.",
    montessori: "Chuẩn bị ghế ăn dặm vững chãi và bộ thìa bát gỗ/silicon chuẩn Montessori. Cho bé tự cầm các loại rau củ hấp mềm (BLW) để tăng xúc giác."
  },
  {
    monthStart: 6,
    monthEnd: 8,
    title: "Giai đoạn tập bò và khám phá 🚼",
    desc: "Bé bắt đầu tự dịch chuyển bằng cách trườn hoặc bò. Không gian xung quanh trở thành một sân chơi khám phá khổng lồ.",
    milestone: "Tự ngồi vững không cần điểm tựa. Biết bò bằng hai tay và hai đầu gối nhịp nhàng.",
    montessori: "Bảo đảm môi trường an toàn tuyệt đối (che chắn ổ điện, góc bàn). Đặt đồ chơi ở khoảng cách vừa phải để kích thích bé bò tới tự lấy."
  },
  {
    monthStart: 8,
    monthEnd: 10,
    title: "Hiểu ngôn ngữ và bám đứng 👣",
    desc: "Bé hiểu được nhiều từ đơn giản và bắt đầu bập bẹ những âm đôi như 'ba-ba', 'ma-ma'. Bé cũng thích vịn thành giường để đứng dậy.",
    milestone: "Biết vẫy tay chào, vỗ tay. Vịn vào đồ nội thất để tự đứng thẳng lên.",
    montessori: "Dành không gian có thanh vịn gỗ gắn tường thấp để bé tự vịn đứng ngắm gương. Nói chuyện rõ ràng, gọi tên đồ vật chính xác (không nói ngọng)."
  },
  {
    monthStart: 10,
    monthEnd: 12,
    title: "Những bước đi đầu đời 🚶",
    desc: "Chúc mừng sinh nhật 1 tuổi của bé! Bé đang chuẩn bị thực hiện bước đi độc lập đầu tiên không cần ai dắt.",
    milestone: "Đứng vững vài giây độc lập. Đi men theo bàn ghế hoặc tự bước đi 2-3 bước đầu tiên.",
    montessori: "Để bé đi chân trần trên cỏ, cát, sàn nhà để tối ưu thụ cảm xúc giác lòng bàn chân, giúp thăng bằng tốt hơn. Đọc sách tranh có từ đơn mỗi tối."
  },
  {
    monthStart: 12,
    monthEnd: 18,
    title: "Thích bắt chước và tự lập 🧺",
    desc: "Bé hiểu các mệnh lệnh đơn giản và rất thích bắt chước hành động của người lớn như quét nhà, lau bàn, xếp đồ.",
    milestone: "Đi lại vững vàng. Nói được 5-10 từ đơn rõ nghĩa. Biết chỉ tay vào món đồ mình muốn.",
    montessori: "Cung cấp các công cụ làm việc thực tế thu nhỏ: chổi nhỏ, khăn lau nhỏ. Khuyến khích bé tự cất đồ chơi vào khay kệ thấp sau khi chơi."
  },
  {
    monthStart: 18,
    monthEnd: 24,
    title: "Thời kỳ nhạy cảm về trật tự 🧱",
    desc: "Bé cực kỳ nhạy cảm với việc sắp đặt vị trí đồ vật. Bé muốn mọi thứ phải nằm đúng chỗ cũ và theo đúng trình tự quen thuộc.",
    milestone: "Nói được cụm 2 từ. Tự chạy nhảy, leo trèo. Thích chơi xếp chồng các khối gỗ.",
    montessori: "Duy trì lịch sinh hoạt nhất quán và sắp đặt kệ đồ chơi gọn gàng, cố định. Trò chơi phân loại màu sắc, hình dạng rất phù hợp lúc này."
  },
  {
    monthStart: 24,
    monthEnd: 36,
    title: "Bùng nổ ngôn ngữ và cái tôi 🗣️",
    desc: "Bé phát triển ngôn ngữ thần tốc, nói được câu dài. Đây cũng là giai đoạn khẳng định cái tôi mạnh mẽ (khủng hoảng tuổi lên 2).",
    milestone: "Tự lên xuống cầu thang. Biết xâu chuỗi hạt, vẽ các nét nguệch ngoạc. Bắt đầu biết nói 'Không!' để tự quyết định.",
    montessori: "Tôn trọng cái tôi của bé bằng cách cho bé lựa chọn (ví dụ: 'Con muốn mặc áo đỏ hay áo xanh?'). Dạy con cách tự đi giày và cởi khoác nhẹ."
  }
];

/**
 * Tính toán tuổi chi tiết của bé (năm, tháng, ngày, tổng số ngày)
 * Hoặc tính số tuần thai nếu là mẹ bầu dựa trên ngày dự sinh.
 */
export function calculateDetailedAge(dob, status, pregnancyInfo) {
  if (status === 'pregnant') {
    // 1. Tính toán cho Mẹ bầu dựa trên ngày dự sinh (dueDate)
    let dueDateStr = pregnancyInfo?.dueDate;
    if (!dueDateStr) {
      // Nếu không có ngày dự sinh, dùng tuần thai nhập lúc onboarding + số ngày trôi qua từ lúc tạo
      const weeks = parseInt(pregnancyInfo?.weeks || 0);
      const days = parseInt(pregnancyInfo?.days || 0);
      return { type: 'pregnant', weeks, days, label: `Bầu ${weeks} tuần ${days} ngày` };
    }

    const dueDate = new Date(dueDateStr);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Thai kỳ chuẩn 280 ngày (40 tuần)
    const currentPregnancyDays = 280 - diffDays;
    const weeks = Math.max(1, Math.min(42, Math.floor(currentPregnancyDays / 7)));
    const days = Math.max(0, Math.min(6, currentPregnancyDays % 7));

    return {
      type: 'pregnant',
      weeks,
      days,
      label: `Bầu ${weeks} tuần ${days} ngày`,
      totalDays: currentPregnancyDays
    };
  } else {
    // 2. Tính toán cho Bé đã sinh dựa trên ngày sinh (dob)
    if (!dob) return { type: 'born', years: 0, months: 0, days: 0, totalDays: 0, label: '—' };
    
    const birth = new Date(dob);
    const today = new Date();
    
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();
    
    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }
    
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    
    const diffTime = today.getTime() - birth.getTime();
    const totalDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    
    let label = '';
    if (years > 0) {
      label = `${years} tuổi ${months} tháng ${days} ngày`;
    } else if (months > 0) {
      label = `${months} tháng ${days} ngày`;
    } else {
      label = `${days} ngày tuổi`;
    }

    return {
      type: 'born',
      years,
      months,
      days,
      totalDays,
      label
    };
  }
}

/**
 * Lấy cẩm nang tương ứng với tuổi thực tế của bé hoặc tuần thai mẹ bầu
 */
export function getHandbookForAge(ageInfo) {
  if (ageInfo.type === 'pregnant') {
    const currentWeek = ageInfo.weeks;
    
    // Tìm tuần gần nhất trong dữ liệu
    const weeksList = Object.keys(PREGNANCY_MILESTONES).map(Number).sort((a, b) => a - b);
    let matchWeek = weeksList[0];
    for (const w of weeksList) {
      if (w <= currentWeek) {
        matchWeek = w;
      } else {
        break;
      }
    }
    
    const milestone = PREGNANCY_MILESTONES[matchWeek];
    return {
      title: `Thai kỳ - Tuần ${currentWeek}`,
      subtitle: milestone.title,
      desc: milestone.desc,
      actionText: "Gợi ý dưỡng thai:",
      actionDesc: milestone.tip,
      badge: "🤰 Thai giáo"
    };
  } else {
    // Bé đã sinh
    const totalMonths = ageInfo.years * 12 + ageInfo.months;
    
    // Tìm nhóm tháng khớp
    const milestone = BABY_MILESTONES.find(
      m => totalMonths >= m.monthStart && totalMonths < m.monthEnd
    ) || BABY_MILESTONES[BABY_MILESTONES.length - 1];
    
    return {
      title: `Bé yêu - ${ageInfo.label}`,
      subtitle: milestone.title,
      desc: milestone.desc,
      actionText: "Mốc phát triển quan trọng:",
      actionDesc: milestone.milestone,
      montessoriText: "Ứng dụng Montessori tại nhà:",
      montessoriDesc: milestone.montessori,
      badge: "👶 Montessori"
    };
  }
}
