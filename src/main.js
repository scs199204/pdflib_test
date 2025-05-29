import fontkit from '@pdf-lib/fontkit';
import { PDFDocument } from 'pdf-lib';
import { getFileData, getPdfFileKey, drawTextPdfFunc, calcOffset, subtotalAdd, isTargetPage, getFontDataFromGitHubPages } from './sdpModulePdfLib.js';

(() => {
  'use strict';
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  /** PDFを描画する
   * @param {object} record kintoneのレコード(event.record)
   * @returns {}
   */
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  async function pdfCreate(record) {
    const params = sdpParam.pdfLib; //パラメタ(sdpParam_pdfLib.js)

    const templatePdfFileKey = await getPdfFileKey(params.app.pdf.id.value, params.app.pdf.recordId.value, params.app.pdf.attachment.value); //ひな形pdfのfileKey取得
    //const fontFileKey = await getPdfFileKey(params.app.font.id.value, params.app.font.recordId.value, params.app.font.attachment.value); //フォントファイルのfileKey取得
    const fontUrl = params.app.font.githubPagesUrl; //

    if (!templatePdfFileKey) {
      alert('請求書雛形PDFが設定されていません。');
      return;
    }
    /*
    if (!fontFileKey) {
      alert('フォントが設定されていません。');
      return;
    }
    */
    if (!fontUrl) {
      alert('フォントのGitHub Pages URLが設定されていません。');
      return;
    }

    try {
      const pdfDoc = await PDFDocument.load(await getFileData(templatePdfFileKey)); //PDFDocumentを読込む(ArrayBuffer)
      pdfDoc.registerFontkit(fontkit); //PDFドキュメント内で利用できるようにするためのフォントエンジン

      //const fontBytes = await getFileData(fontFileKey); // フォントファイルを取得
      const fontBytes = await getFontDataFromGitHubPages(fontUrl); // フォントファイルを取得
      const customFont = await pdfDoc.embedFont(fontBytes, { subset: true }); //サブセット化すると、フォントによっては一部の文字が表示されなくなる可能性ある
      //const customFont = await pdfDoc.embedFont(fontBytes); //ドキュメントにフォントを埋め込む(ファイルサイズが大きくなる)

      //全体のページ数
      let totalPage = 1;
      if (params.hasOwnProperty('pageBreakTable')) {
        totalPage = Math.ceil(record[params.pageBreakTable.fieldCode].value.length / params.pageBreakTable.maxRow); //サブテーブルの行数 ÷ １ページ当たりの行数
      }

      //改ページ考慮
      let copiedPage; //２ページ目以降作成の為、退避用ページ
      let nextPageRowCount = 0; //改ページ対象テーブルの読込行
      for (let pageCount = 0; pageCount < totalPage; pageCount++) {
        let page;
        if (pageCount === 0) {
          page = pdfDoc.getPage(0); //先頭ページの場合は、そのまま取得
        } else {
          pdfDoc.insertPage(pageCount, copiedPage); // コピーしたページを2ページ目として挿入
          page = pdfDoc.getPage(pageCount); // 新しく追加された2ページ目を取得
        }
        [copiedPage] = await pdfDoc.copyPages(pdfDoc, [pageCount]); //編集前のページを退避させ、次ページ作成時に使用する

        const drawTextPdf = drawTextPdfFunc(page, customFont); //テキスト描画用の関数作成(ページ毎に作成する必要がある)

        //ページ数の描画
        if (params.hasOwnProperty('pageCount')) {
          let pageValue = '';
          const currentPage = pageCount + 1;
          if (params.pageCount.type === 'Pn') {
            pageValue = 'P' + currentPage; //P1
          } else {
            pageValue = currentPage + ' / ' + totalPage; // 1/1
          }
          page.drawText(pageValue, { x: params.pageCount.x, y: params.pageCount.y, font: customFont, size: params.pageCount.size });
        }

        //テキスト
        if (params.hasOwnProperty('text')) {
          for (const drawItem of params.text) {
            //描画する対象ページの判定
            if (isTargetPage(drawItem, pageCount, totalPage)) {
              drawTextPdf(drawItem, record, drawItem.y); //pdfにテキスト描画
            }
          }
        }

        //画像
        if (params.hasOwnProperty('image')) {
          for (const drawItem of params.image) {
            //描画する対象ページの判定
            if (isTargetPage(drawItem, pageCount, totalPage)) {
              try {
                const signatureImageFileKey = record[drawItem.fieldCode].value[0].fileKey; //画像のfileKey
                if (signatureImageFileKey) {
                  const signatureImageBytes = await getFileData(signatureImageFileKey); // 画像を取得
                  const signatureImage = await pdfDoc.embedPng(signatureImageBytes); //PNGファイルの埋め込み
                  let widthRatio = 0;
                  let heightRatio = 0;
                  //幅の割合指定
                  if (drawItem.hasOwnProperty('widthRatio')) {
                    widthRatio = drawItem.widthRatio;
                    heightRatio = drawItem.hasOwnProperty('heightRatio') ? drawItem.heightRatio : drawItem.widthRatio; //heightがない場合、幅と同じ割合
                    //幅指定
                  } else if (drawItem.hasOwnProperty('width')) {
                    widthRatio = drawItem.width / signatureImage.width; //指定した幅になるように割合調節
                    heightRatio = drawItem.hasOwnProperty('height') ? drawItem.height / signatureImage.height : widthRatio;
                  } else {
                    throw new Error(fieldCode + 'の幅が設定されていません');
                  }
                  page.drawImage(signatureImage, { x: drawItem.x, y: drawItem.y, width: signatureImage.width * widthRatio, height: signatureImage.height * heightRatio });
                }
              } catch (error) {
                console.error('画像の埋め込みエラー:', error);
                alert('画像の処理中にエラーが発生しました。');
              }
            }
          }
        }

        //サブテーブル
        if (params.hasOwnProperty('table')) {
          for (const drawItem of params.table) {
            //描画する対象ページの判定
            if (isTargetPage(drawItem, pageCount, totalPage)) {
              let y = drawItem.y; //y座標の初期値
              //サブテーブルの行数
              for (let rowCount = 0; record[drawItem.fieldCode].value.length > rowCount; rowCount++) {
                const recordRow = record[drawItem.fieldCode].value[rowCount];
                let maxHeight = 0;
                //tableプロパティの項目数
                for (const column of drawItem.column) {
                  const height = drawTextPdf(column, recordRow.value, y); //サブテーブルの1行分を描画
                  maxHeight = maxHeight > height ? maxHeight : height; //三項演算子で、maxHeightとheightの大きい方を保持
                }
                y -= calcOffset(drawItem, maxHeight); //次の行のy軸座標算出
              }
            }
          }
        }

        //改ページ考慮ありのサブテーブル
        if (params.hasOwnProperty('pageBreakTable')) {
          const drawItem = params.pageBreakTable; //改ページ考慮ありのテーブルは一つだけ設定可
          let y = drawItem.y; //y座標の初期値
          let rowAllDraw = false; //全ての行を描画し終えたら処理終了するためのフラグ
          const subtotal = {}; //小計用オブジェクト

          //サブテーブルの行(複数ページ考慮のため、前頁までに描画し終えた行を初期値とする)
          for (let rowCount = nextPageRowCount; record[drawItem.fieldCode].value.length > rowCount; rowCount++) {
            const recordRow = record[drawItem.fieldCode].value[rowCount];
            let maxHeight = 0;
            //１行分の出力項目
            for (const column of drawItem.column) {
              subtotalAdd(subtotal, column, recordRow.value); //小計項目の集計
              const height = drawTextPdf(column, recordRow.value, y); //テキスト描画
              maxHeight = maxHeight > height ? maxHeight : height; //三項演算子で、maxHeightとheightの大きい方を保持
            }
            y -= calcOffset(drawItem, maxHeight); //次の行のy軸座標算出
            if (rowCount + 1 >= record[drawItem.fieldCode].value.length) {
              rowAllDraw = true; //サブテーブル全ての行を描画し終えたらtrue
            }
            if (rowCount + 1 - nextPageRowCount >= drawItem.maxRow) {
              nextPageRowCount = rowCount + 1; //1ページ当たりの描画行数を描画し終えたら行数を退避してループを抜ける
              break; //1ページ分の描画を終了、未描画の行があれば次ページ作成する。
            }
          }

          //小計行の描画(プロパティが存在しない場合はfalse)
          if (params.pageBreakTable?.subtotal) {
            let subtotal_y = y; //一旦、現在のy座標取得
            if (params.pageBreakTable.hasOwnProperty('y_Offset')) {
              subtotal_y = params.pageBreakTable.y - params.pageBreakTable.y_Offset * params.pageBreakTable.maxRow; //y_Offsetがあれば最大行の１行下に描画
            }
            for (const column of drawItem.column) {
              //小計行の描画項目(プロパティが存在しない場合はfalse)
              if (column?.subtotal) {
                const subtotalColumn = structuredClone(column); //ディープコピー
                if (subtotalColumn.hasOwnProperty('maxWidth')) {
                  subtotalColumn.x += subtotalColumn.maxWidth; //maxWidthの指定があれば、最大幅の位置で右寄せする
                  subtotalColumn.align = 'right'; //小計行は、全て右寄せ→明細行の位置と合わせることができないので設定しないようにした
                }
                //formatに「comma」追加→カンマ編集時にstringへ変換してwidthOfTextAtSizeでエラーにならないようにする
                if (subtotalColumn.hasOwnProperty('format')) {
                  if (!subtotalColumn.format.includes('comma')) {
                    subtotalColumn.format.push('comma');
                  }
                } else {
                  subtotalColumn.format = ['comma'];
                }
                const height = drawTextPdf(subtotalColumn, subtotal, subtotal_y); //subtotalがtrueの項目のみ小計描画
              }
            }
          }

          if (rowAllDraw) {
            break; //全ての行を描画し終えたらループを抜ける
          }
        }
      }
      // PDF を保存＆ダウンロード
      const pdfBytes = await pdfDoc.save(); //ドキュメントをPDFファイルを構成するバイト配列にシリアル化する
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `請求書_${record.請求番号.value}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF出力エラー:', error);
      alert('PDF出力に失敗しました。');
    }
  }
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  //★ レコード詳細画面表示イベント
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  kintone.events.on('app.record.detail.show', async (event) => {
    const record = event.record;
    const printButton = document.createElement('button');
    printButton.textContent = '請求書PDF出力';
    printButton.className = 'kintoneplugin-button-dialog-ok';

    printButton.addEventListener('click', async () => {
      pdfCreate(record);
    });

    const spaceElement = kintone.app.record.getSpaceElement('printButtonSpace');
    if (spaceElement) {
      spaceElement.appendChild(printButton);
    }
  });
})();
