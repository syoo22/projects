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
        sheet.getRange(i + 2, 8).setValue("X"); // H
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

          const reEll =
            /<span[^>]*class=["'][^"']*\bell\b[^"']*["'][^>]*>\s*#\s*([^<]+?)\s*<\/span>/gi;
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

      /* 🟣 티스토리: "태그 컨테이너" 안에서만 태그 추출 (사이드바/태그클라우드 오인 방지) */
      if (url.includes("tistory.com")) {
        // 태그가 들어있는 컨테이너 후보들 (사용자가 제공한 패턴 + box-tag)
        const tagContainerRegexes = [
          /<div[^>]*class=["'][^"']*\bentry-tag\b[^"']*["'][^>]*>[\s\S]*?<\/div>/i,
          /<div[^>]*class=["'][^"']*\btags\b[^"']*["'][^>]*>[\s\S]*?<\/div>/i,
          /<div[^>]*class=["'][^"']*\btag_content\b[^"']*["'][^>]*>[\s\S]*?<\/div>/i,
          /<div[^>]*class=["'][^"']*\bpost-tags\b[^"']*["'][^>]*>[\s\S]*?<\/div>/i,
          /<div[^>]*class=["'][^"']*\barticle-tag\b[^"']*["'][^>]*>[\s\S]*?<\/div>/i,
          /<div[^>]*class=["'][^"']*\bitems\b[^"']*["'][^>]*>[\s\S]*?<\/div>/i,
          /<div[^>]*class=["'][^"']*\bbox-tag\b[^"']*["'][^>]*>[\s\S]*?<\/div>/i,
          /<div[^>]*id=["']tags["'][^>]*>[\s\S]*?<\/div>/i,
        ];

        // 컨테이너 매칭된 부분만 scope로 합치기
        let scope = "";
        tagContainerRegexes.forEach(re => {
          const m = content.match(re);
          if (m && m[0]) scope += "\n" + m[0];
        });

        // scope 안에서만 rel="tag" 텍스트 추출
        const reRelTagText = /<a[^>]*rel=["']tag["'][^>]*>(.*?)<\/a>/gi;
        let mm;
        while ((mm = reRelTagText.exec(scope)) !== null) {
          const raw = (mm[1] || "")
            .replace(/<[^>]+>/g, "")
            .replace(/&nbsp;/g, " ")
            .trim();
          if (raw) tags.push(raw);
        }

        // 보완: rel="tag"가 없는 스킨이면 scope 안에서만 /tag/ 링크 fallback
        // ⚠️ content 전체에서 찾지 않음(오탐 방지)
        if (tags.length === 0 && scope) {
          const tagLinks = scope.match(/\/tag\/([^"'<> ]+)/g);
          if (tagLinks) {
            tagLinks.forEach(t => {
              const rawTag = t.replace("/tag/", "");
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

      // ✅ 포함이면 O
      const hashtagOK = tags.some(tag => (tag || "").includes("멋쟁이사자처럼")) ? "O" : "X";

      /* =========================
         4) 네이버 태그 자동추출 실패 로그 (I열)
      ========================== */
      if (url.includes("naver.com") && tags.length === 0) {
        sheet.getRange(i + 2, 9).setValue("태그 자동추출 불가"); // I열
      }

      /* =========================
         5) 결과 입력 (O/X만)
      ========================== */
      sheet.getRange(i + 2, 6).setValue(titleOK);    // F열
      sheet.getRange(i + 2, 7).setValue(hashtagOK);  // G열

      const finalResult = (titleOK === "O" && hashtagOK === "O") ? "O" : "X";
      sheet.getRange(i + 2, 8).setValue(finalResult); // H열

    } catch (e) {
      // 에러도 X 처리
      sheet.getRange(i + 2, 6).setValue("X");
      sheet.getRange(i + 2, 7).setValue("X");
      sheet.getRange(i + 2, 8).setValue("X");
    }
  });
}
