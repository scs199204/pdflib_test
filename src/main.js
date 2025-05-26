import fontkit from '@pdf-lib/fontkit';
import { PDFDocument } from 'pdf-lib';

(() => {
  'use strict';
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  /** kintone APIからファイルデータを取得
   * @param {string} fileKey
   * @returns {arrayBuffer} 読込んだファイルをarrayBufferに変換
   */
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  async function getFileData(fileKey) {
    const response = await fetch(`/k/v1/file.json?fileKey=${fileKey}`, {
      method: 'GET',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!response.ok) throw new Error('ファイル取得に失敗しました');
    return await response.arrayBuffer();
  }

  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  /** フォントファイルの fileKey を別アプリから取得(アプリID2589)
   * @param {number} 添付ファイルを取得するアプリＩＤ
   * @param {number} 添付ファイルを取得するレコード番号
   * @param {string} 添付ファイルのフィールドコード
   * @returns {} フォントファイルのfileKey
   */
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  async function getPdfFileKey(appId, id, fieldCode) {
    const response = await kintone.api(kintone.api.url('/k/v1/record.json', true), 'GET', { app: appId, id: id });
    return response.record?.[fieldCode].value?.[0]?.fileKey || null;
  }

  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  /** drawTextを行う関数を戻り値とする関数(クロージャ)
   * @param {*} argPage ページ
   * @param {*} argCustomFont フォント
   * @returns {function} パラメタ、レコード、y座標を引数とする関数
   */
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const drawTextPdfFunc = (argPage, argCustomFont) => {
    const page = argPage;
    const customFont = argCustomFont;
    return (param, record, y) => {
      let x = param.x;
      let targetText = record[param.fieldCode].value;
      //formatプロパティがある場合のみ
      if (param?.format) {
        for (const formatItem of param.format) {
          //カンマ編集
          if (formatItem === 'comma') {
            targetText = new Intl.NumberFormat('ja-JP').format(targetText);
          }
        }
      }
      if (param?.align) {
        if (param.align === 'right') {
          x -= customFont.widthOfTextAtSize(targetText, param.size); //drawTextは左端を指定、paramは揃えたい右端を指定しているので文字数分ずらす
          // 例)パラメタ：100　文字サイズ：3　の場合、100-3=97　をdrawTextに渡すと左端が97なので文字の右端が100で揃えられる。
        }
      }
      //プロパティがある場合、文字列を結合する
      let joinText = '';
      if (param?.preFix) {
        joinText += param.preFix;
      }
      joinText += targetText;
      if (param?.postFix) {
        joinText += param.postFix;
      }

      const drawTextOptions = { x: x, y: y, font: customFont, size: param.size };

      //maxWidthが効かないため、sizeに応じてmaxWidthに収まる文字数分を抽出する。
      if (param?.maxWidth) {
        //文字の幅と、maxWidthを比較して、maxWidthに収まらない場合収まる文字数分のみ描画
        if (customFont.widthOfTextAtSize(joinText, param.size) > param.maxWidth) {
          const estimatedCharWidth = currentWidth / joinText.length; // 1文字あたりの概算幅
          const maxChars = Math.floor(param.maxWidth / estimatedCharWidth); // 収まる文字数の概算
          const truncatedText = joinText.substring(0, maxChars);
          joinText = truncatedText;
        }
      }

      /*
      //maxWidthが効かないため、使わない
      if (param?.maxWidth) {
        drawTextOptions.maxWidth = param.maxWidth;
        //drawTextOptions.lineHeight = param.lineHeight;
        drawTextOptions.wordBreaks = [];
      }
      */
      page.drawText(joinText, drawTextOptions);
      return customFont.heightAtSize(param.size); //文字サイズを元に、高さを返す
    };
  };
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  /** オフセットから、次の行を描画するy軸座標を返す
   * @param {object} drawItem パラメタ
   * @param {number} maxHeight 最大の文字の高さ
   * @returns {number} 次のy軸座標位置
   */
  function calcOffset(drawItem, maxHeight) {
    if (drawItem?.y_OffsetFontSize) {
      result = maxHeight + drawItem.y_Offset; //y座標更新(文字の高さ+オフセット)
    } else {
      result = drawItem.y_Offset; //y座標更新(yをマイナスして座標を下へ移動)
    }
    return result;
  }

  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  /**
   * @param {object} record kintoneのレコード(event.record)
   * @returns {}
   */
  //★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  async function pdfCreate(record) {
    const params = sdpParam.pdfLib; //パラメタ(sdpParam_pdfLib.js)

    const templatePdfFileKey = await getPdfFileKey(params.app.pdf.id.value, params.app.pdf.recordId.value, params.app.pdf.attachment.value); //ひな形pdfのfileKey取得
    const fontFileKey = await getPdfFileKey(params.app.font.id.value, params.app.font.recordId.value, params.app.font.attachment.value); //フォントファイルのfileKey取得

    if (!templatePdfFileKey) {
      alert('請求書雛形PDFが設定されていません。');
      return;
    }
    if (!fontFileKey) {
      alert('フォントが設定されていません。');
      return;
    }

    try {
      const pdfDoc = await PDFDocument.load(await getFileData(templatePdfFileKey)); //PDFDocumentを読込む(ArrayBuffer)
      pdfDoc.registerFontkit(fontkit); //PDFドキュメント内で利用できるようにするためのフォントエンジン

      const fontBytes = await getFileData(fontFileKey); // フォントファイルを取得
      const customFont = await pdfDoc.embedFont(fontBytes); //ドキュメントにフォントを埋め込む

      //改ページ考慮
      let copiedPage; //２ページ目以降作成の為、退避用ページ
      let nextPageRowCount = 0; //改ページ対象テーブルの読込行
      for (let pageCount = 0; true; pageCount++) {
        let page;
        if (pageCount === 0) {
          page = pdfDoc.getPage(0); //先頭ページの場合は、そのまま取得
        } else {
          pdfDoc.insertPage(pageCount, copiedPage); // コピーしたページを2ページ目として挿入
          page = pdfDoc.getPage(pageCount); // 新しく追加された2ページ目を取得
        }
        [copiedPage] = await pdfDoc.copyPages(pdfDoc, [pageCount]); //編集前のページを退避させ、次ページ作成時に使用する

        const drawTextPdf = drawTextPdfFunc(page, customFont); //テキスト描画用の関数作成(ページ毎に作成する必要がある)

        //テキスト
        if (params?.text) {
          for (const drawItem of params.text) {
            drawTextPdf(drawItem, record, drawItem.y); //pdfにテキスト描画
          }
        }

        //画像
        if (params?.image) {
          for (const drawItem of params.image) {
            try {
              const signatureImageFileKey = record[drawItem.fieldCode].value[0].fileKey; //画像のfileKey
              if (signatureImageFileKey) {
                const signatureImageBytes = await getFileData(signatureImageFileKey); // 画像を取得
                const signatureImage = await pdfDoc.embedPng(signatureImageBytes); //PNGファイルの埋め込み
                const height = drawItem?.height ? drawItem.height : drawItem.width;
                page.drawImage(signatureImage, { x: drawItem.x, y: drawItem.y, width: signatureImage.width * drawItem.width, height: signatureImage.height * height });
              }
            } catch (error) {
              console.error('画像の埋め込みエラー:', error);
              alert('画像の処理中にエラーが発生しました。');
            }
          }
        }

        //サブテーブル
        if (params?.table) {
          for (const drawItem of params.table) {
            let y = drawItem.y; //y座標の初期値
            //サブテーブルの行数
            for (const recordRow of record[drawItem.fieldCode].value) {
              let maxHeight = 0;
              //tableプロパティの項目数
              for (const row of drawItem.row) {
                const height = drawTextPdf(row, recordRow.value, y); //サブテーブルの1行分を描画
                maxHeight = maxHeight > height ? maxHeight : height; //三項演算子で、maxHeightとheightの大きい方を保持
              }
              y -= calcOffset(drawItem, maxHeight); //次の行のy軸座標算出
            }
          }
        }

        //改ページ考慮ありのサブテーブル
        if (params?.pageBreakTable) {
          const drawItem = params.pageBreakTable; //改ページ考慮ありのテーブルは一つだけ設定可
          let y = drawItem.y; //y座標の初期値
          let rowAllDraw = false; //全ての行を描画し終えたら処理終了するためのフラグ
          //サブテーブルの行(複数ページ考慮のため、前頁までに描画し終えた行を初期値とする)
          for (let rowCount = nextPageRowCount; record[drawItem.fieldCode].value.length > rowCount; rowCount++) {
            let maxHeight = 0;
            for (const row of drawItem.row) {
              const height = drawTextPdf(row, record[drawItem.fieldCode].value[rowCount].value, y); //テキスト描画
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
