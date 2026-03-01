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

      Utilities.sleep(700);

      const response = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true,
        followRedirects: true,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const code = response.getResponseCode();
      const content = response.getContentText() || "";

      if (code !== 200 || !content) {
        sheet.getRange(i + 2, 6).setValue("X");
        sheet.getRange(i + 2, 7).setValue("X");
        sheet.getRange(i + 2, 8).setValue("X");
        return;
      }

      /* =========================
         2) 제목 검사 (F열)
      ========================== */

      let title = "";

      if (url.includes("velog.io")) {
        const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (h1Match && h1Match[1]) title = h1Match[1];
      }

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
      ========================== */

      let tags = [];

      /* 🔵 네이버 블로그 */
      if (url.includes("naver.com")) {

        const reTagName = /PostListByTagName\.naver\?[^"']*tagName=([^"&]+)/gi;
        let m1;

        while ((m1 = reTagName.exec(content)) !== null) {
          try {
            tags.push(decodeURIComponent(m1[1]).replace(/\+/g, " ").trim());
          } catch (e) {
            tags.push((m1[1] || "").replace(/\+/g, " ").trim());
          }
        }

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

        const boxTagMatch =
          content.match(/<div class="box-tag">([\s\S]*?)<\/div>/i);

        if (boxTagMatch && boxTagMatch[1]) {

          const tagSection = boxTagMatch[1];

          const tagMatches =
            tagSection.match(/rel="tag">(.*?)<\/a>/g);

          if (tagMatches) {
            tagMatches.forEach(tag => {
              const mm = tag.match(/>(.*?)<\/a>/);
              if (mm && mm[1]) tags.push(mm[1].trim());
            });
          }
        }
      }

      tags = [...new Set(tags)];

      const hashtagOK =
        tags.some(tag =>
          (tag || "").includes("멋쟁이사자처럼")
        ) ? "O" : "X";

      /* =========================
         네이버 자동추출 실패 로그
      ========================== */

      if (url.includes("naver.com") && tags.length === 0) {
        sheet.getRange(i + 2, 9)
          .setValue("MANUAL_NAVER (태그 자동추출 불가)");
      }

      /* =========================
         결과 입력
      ========================== */

      sheet.getRange(i + 2, 6).setValue(titleOK);
      sheet.getRange(i + 2, 7).setValue(hashtagOK);

      const finalResult =
        (titleOK === "O" && hashtagOK === "O") ? "O" : "X";

      sheet.getRange(i + 2, 8).setValue(finalResult);

    } catch (e) {

      sheet.getRange(i + 2, 6).setValue("X");
      sheet.getRange(i + 2, 7).setValue("X");
      sheet.getRange(i + 2, 8).setValue("X");

    }

  });

}
