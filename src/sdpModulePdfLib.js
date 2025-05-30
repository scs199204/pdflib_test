import { rgb } from 'pdf-lib';

('use strict');
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
    try {
      let x = param.x;
      let targetText = record[param.fieldCode].value == null ? '' : record[param.fieldCode].value; //null もしくは undefinedの場合,空文字''

      //formatプロパティがある場合のみ
      if (param.hasOwnProperty('format')) {
        for (const formatItem of param.format) {
          //カンマ編集
          if (formatItem === 'comma') {
            targetText = new Intl.NumberFormat('ja-JP').format(targetText);
          }
        }
      }
      if (param.hasOwnProperty('align')) {
        if (param.align === 'right') {
          x -= customFont.widthOfTextAtSize(targetText, param.size); //drawTextは左端を指定、paramは揃えたい右端を指定しているので文字数分ずらす
          // 例)パラメタ：100　文字サイズ：3　の場合、100-3=97　をdrawTextに渡すと左端が97なので文字の右端が100で揃えられる。
        }
      }
      //プロパティがある場合、文字列を結合する
      let joinText = '';
      if (param.hasOwnProperty('preFix')) {
        joinText += param.preFix;
      }
      joinText += targetText;
      if (param.hasOwnProperty('postFix')) {
        joinText += param.postFix;
      }
      const drawTextOptions = { x: x, y: y, font: customFont, size: param.size };
      //maxWidthが効かないため、sizeに応じてmaxWidthに収まる文字数分を抽出する
      if (param.hasOwnProperty('maxWidth')) {
        //文字の幅と、maxWidthを比較して、maxWidthに収まらない場合収まる文字数分のみ描画
        const currentWidth = customFont.widthOfTextAtSize(joinText, param.size);
        if (currentWidth > param.maxWidth) {
          const estimatedCharWidth = currentWidth / joinText.length; // 1文字あたりの概算幅
          const maxChars = Math.floor(param.maxWidth / estimatedCharWidth); // 収まる文字数の概算
          const truncatedText = joinText.substring(0, maxChars);
          joinText = truncatedText;
        }
      }

      //文字色の設定
      if (param.hasOwnProperty('color')) {
        let red = 0;
        let green = 0;
        let blue = 0;
        if (param.color.hasOwnProperty('red')) {
          red = param.color.red > 255 ? 1 : param.color.red / 255;
        }
        if (param.color.hasOwnProperty('green')) {
          green = param.color.green > 255 ? 1 : param.color.green / 255;
        }
        if (param.color.hasOwnProperty('blue')) {
          blue = param.color.blue > 255 ? 1 : param.color.blue / 255;
        }
        drawTextOptions.color = rgb(red, green, blue);
      }

      /*
      //maxWidthが効かないため、使わない
      if (param.hasOwnProperty('maxWidth')) {
        drawTextOptions.maxWidth = param.maxWidth;
        //drawTextOptions.lineHeight = param.lineHeight;
        drawTextOptions.wordBreaks = [];
      }
      */
      const { width: pageWidth, height: pageHeight } = page.getSize();
      const width = param.hasOwnProperty('maxWidth') ? param.maxWidth : customFont.widthOfTextAtSize(joinText, param.size);
      //描画位置がページの範囲内かどうかのチェック
      if (isInCoordinateRange(x, y, width, customFont.heightAtSize(param.size), pageWidth, pageHeight)) {
        page.drawText(joinText, drawTextOptions);
      } else {
        throw new Error(param.fieldCode + 'がページの範囲外です。');
      }
      return customFont.heightAtSize(param.size); //文字サイズを元に、高さを返す
    } catch (error) {
      console.error(error.message);
      throw new Error(error);
    }
  };
};
//★★★★★★★★★★★★★★★★★★★★★★★★★★★★
/** オフセットから、次の行を描画するy軸座標を返す
 * @param {object} drawItem パラメタ
 * @param {number} maxHeight 最大の文字の高さ
 * @returns {number} 次のy軸座標位置
 */
//★★★★★★★★★★★★★★★★★★★★★★★★★★★★
function calcOffset(drawItem, maxHeight) {
  //存在しないもしくはfalse
  if (drawItem?.y_OffsetFontSize) {
    result = maxHeight + drawItem.y_Offset; //y座標更新(文字の高さ+オフセット)
  } else {
    result = drawItem.y_Offset; //y座標更新(yをマイナスして座標を下へ移動)
  }
  return result;
}

//★★★★★★★★★★★★★★★★★★★★★★★★★★★★
/** 小計の為の項目集計
 * @param {object} subtotal 集計用のオブジェクト
 * @param {object} column パラメタ
 * @param {object} record kintoneレコード
 */
//★★★★★★★★★★★★★★★★★★★★★★★★★★★★
function subtotalAdd(subtotal, column, record) {
  const targetValue = Number(record[column.fieldCode].value);
  //集計項目を作成し、0で初期化
  if (!subtotal.hasOwnProperty([column.fieldCode])) {
    subtotal[column.fieldCode] = { value: 0 };
  }

  if (column?.subtotal) {
    if (column.subtotal === 'sum' && Number.isFinite(targetValue)) {
      subtotal[column.fieldCode].value += targetValue; //数値の場合、合計
    } else {
      subtotal[column.fieldCode].value += 1; //数値以外の場合、件数
    }
  }
}

//★★★★★★★★★★★★★★★★★★★★★★★★★★★★
/** 描画対象ページの判定
 * @param {object} drawItem パラメタ
 * @param {number} pageCount 現在のページ
 * @param {number} totalPage 全体のページ数
 * @returns {bool} true：描画対象　false：対象外
 */
//★★★★★★★★★★★★★★★★★★★★★★★★★★★★
function isTargetPage(drawItem, pageCount, totalPage) {
  if (
    !drawItem.hasOwnProperty('targetPage') ||
    drawItem.targetPage === 'all' ||
    (pageCount === 0 && drawItem.targetPage === 'first') ||
    (pageCount + 1 === totalPage && drawItem.targetPage === 'last')
  ) {
    return true;
  } else {
    return false;
  }
}

//★★★★★★★★★★★★★★★★★★★★★★★★★★★★
/** urlからフォントファイルを取得して、arrayBufferへ変換する
 * @param {string } url フォントファイルが保存されているurl
 * @returns {arrayBuffer} フォントファイルをarrayBufferに変換したもの
 */
//★★★★★★★★★★★★★★★★★★★★★★★★★★★★
async function getFontDataFromGitHubPages(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch font from ${url}: ${response.statusText}`);
    }
    return await response.arrayBuffer(); // ArrayBufferとして取得
  } catch (error) {
    console.error('Error fetching font from GitHub Pages:', error);
    throw error; // エラーを再スローして呼び出し元で処理できるようにする
  }
}

//★★★★★★★★★★★★★★★★★★★★★★★★★★★★
/** 描画する要素がPDFの範囲内にあるか
 * @param {number} coordinateX 要素の開始点(x座標)
 * @param {number} coordinateY  要素の開始点(y座標)
 * @param {number} width 要素の幅
 * @param {number} height 要素の高さ
 * @param {number} pageSizeX ページの幅
 * @param {number} pageSizeY ページの高さ
 * @returns {bool} true：範囲内　false：範囲外
 */
//★★★★★★★★★★★★★★★★★★★★★★★★★★★★
function isInCoordinateRange(coordinateX, coordinateY, width, height, pageSizeX, pageSizeY) {
  return coordinateX + width > pageSizeX || coordinateY + height > pageSizeY ? false : true;
}

export { getFileData, getPdfFileKey, drawTextPdfFunc, calcOffset, subtotalAdd, isTargetPage, getFontDataFromGitHubPages, isInCoordinateRange };
