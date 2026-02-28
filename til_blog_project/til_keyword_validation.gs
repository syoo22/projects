function checkBlogLinks() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  const urls = sheet.getRange("A2:A" + lastRow).getValues();

  urls.forEach((row, i) => {
    let url = row[0];
    if (!url) return;

    try {
      /* =========================
         1) 네이버 모바일 전환
      ========================== */
      if (url.includes("blog.naver.com")) {
        url = url.replace("blog.naver.com", "m.blog.naver.com");
      }

      // 너무 빠른 연속 요청 방지(차단/변형 응답 완화)
      Utilities.sleep(700);

      const response = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true,
        followRedirects: true,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const code = response.getResponseCode();
      const content = response.getContentText() || "";

      // 응답이 비정상이면 바로 X 처리
      if (code !== 200 || !content) {
        sheet.getRange(i + 2, 6).setValue("X"); // F
        sheet.getRange(i + 2, 7).setValue("X"); // G
        return;
      }

      /* =========================
         2) 제목 검사 (F열)
      ========================== */
      let title = "";

      // 벨로그는 h1 우선
      if (url.includes("velog.io")) {
        const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (h1Match && h1Match[1]) title = h1Match[1];
      }

      // 공통 og:title → 없으면 title fallback
      if (!title) {
        const ogMatch = content.match(/property="og:title"\s*content="(.*?)"/i);
        if (ogMatch && ogMatch[1]) {
          title = ogMatch[1];
        } else {
          const basicMatch = content.match(/<title[^>]*>(.*?)<\/title>/i);
          title = basicMatch && basicMatch[1] ? basicMatch[1] : "";
        }
      }

      const normalizedTitle = (title || "").replace(/\s/g, "");
      const titleOK = normalizedTitle.includes("멋쟁이사자처럼") ? "O" : "X";

      /* =========================
         3) 태그 검사 (G열)
         - '멋쟁이사자처럼' 포함이면 O
      ========================== */
      let tags = [];

      /* 🔵 네이버 블로그 - 안정형: tagName= → span.ell → se-hashtag */
      if (url.includes("naver.com")) {
        // 1) 가장 안정적: href 안의 tagName= 파라미터 추출
        const reTagName = /PostListByTagName\.naver\?[^"']*tagName=([^"&]+)/gi;
        let m1;
        while ((m1 = reTagName.exec(content)) !== null) {
          try {
            tags.push(decodeURIComponent(m1[1]).replace(/\+/g, " ").trim());
          } catch (e) {
            tags.push((m1[1] || "").replace(/\+/g, " ").trim());
          }
        }

        // 2) tagList 구조: span.ell의 #태그
        if (tags.length === 0) {
          const footerMatch = content.match(
            /<div[^>]*id=["']post_footer_contents["'][\s\S]*?<\/div>\s*<\/div>/i
          );
          const scope = footerMatch ? footerMatch[0] : content;

          const reEll = /<span[^>]*class=["'][^"']*\bell\b[^"']*["'][^>]*>\s*#\s*([^<]+?)\s*<\/span>/gi;
          let m2;
          while ((m2 = reEll.exec(scope)) !== null) {
            tags.push((m2[1] || "").replace(/&nbsp;/g, " ").trim());
          }
        }

        // 3) 구형/스마트에디터: se-hashtag
        if (tags.length === 0) {
          const tagMatches = content.match(/class="se-hashtag".*?>(.*?)<\/a>/g);
          if (tagMatches) {
            tagMatches.forEach(tag => {
              const mm = tag.match(/>(.*?)<\/a>/);
              if (mm && mm[1]) tags.push(mm[1].replace("#", "").trim());
            });
          }
        }
      }

      /* 🟢 벨로그 */
      if (url.includes("velog.io")) {
        const velogTags = content.match(/\/tags\/([^"'<> ]+)/g);
        if (velogTags) {
          velogTags.forEach(tag => {
            const rawTag = tag.replace("/tags/", "");
            try {
              tags.push(decodeURIComponent(rawTag));
            } catch (e) {
              tags.push(rawTag);
            }
          });
        }
      }

      /* 🟣 티스토리 */
      if (url.includes("tistory.com")) {
        // 1) box-tag 우선
        const boxTagMatch = content.match(/<div class="box-tag">([\s\S]*?)<\/div>/i);
        if (boxTagMatch && boxTagMatch[1]) {
          const tagSection = boxTagMatch[1];
          const tagMatches = tagSection.match(/rel="tag">(.*?)<\/a>/g);
          if (tagMatches) {
            tagMatches.forEach(tag => {
              const mm = tag.match(/>(.*?)<\/a>/);
              if (mm && mm[1]) tags.push(mm[1].trim());
            });
          }
        }

        // 2) div.tags / rel="tag" 구조 대응
        if (tags.length === 0) {
          const tagSectionMatch = content.match(/<div class=["']tags["'][^>]*>([\s\S]*?)<\/div>/i);
          if (tagSectionMatch && tagSectionMatch[1]) {
            const section = tagSectionMatch[1];
            const re = /rel=["']tag["']>(.*?)<\/a>/gi;
            let m3;
            while ((m3 = re.exec(section)) !== null) {
              tags.push((m3[1] || "").trim());
            }
          }
        }

        // 3) 그래도 없으면 /tag/ 링크 fallback
        if (tags.length === 0) {
          const tagLinks = content.match(/\/tag\/([^"'<> ]+)/g);
          if (tagLinks) {
            tagLinks.forEach(tag => {
              const rawTag = tag.replace("/tag/", "");
              try {
                tags.push(decodeURIComponent(rawTag));
              } catch (e) {
                tags.push(rawTag);
              }
            });
          }
        }
      }

      // 중복 제거
      tags = [...new Set(tags)];

      // ✅ 포함이면 O (후기/부트캠프 등도 O)
      const hashtagOK = tags.some(tag => (tag || "").includes("멋쟁이사자처럼")) ? "O" : "X";

      /* =========================
         4) 결과 입력 (O/X만)
      ========================== */
      sheet.getRange(i + 2, 6).setValue(titleOK);    // F열
      sheet.getRange(i + 2, 7).setValue(hashtagOK);  // G열

      const finalResult = (titleOK === "O" && hashtagOK === "O") ? "O" : "X";
      sheet.getRange(i + 2, 8).setValue(finalResult); // H열

    } catch (e) {
      // 규칙상 O/X만 가능하니 에러도 X 처리
      sheet.getRange(i + 2, 6).setValue("X");
      sheet.getRange(i + 2, 7).setValue("X");
    }
  });
}
