var sdpParam = sdpParam || {};
//念のため、即時関数(できればパラメタはjsより前に置く)
(function () {
  sdpParam.pdfLib = sdpParam.pdfLib || {
    app: {
      pdf: {
        id: { value: 2589 }, //雛形ファイルを保存しているアプリＩＤ・レコード・フィールド名
        recordId: { value: 9 }, //レコード
        attachment: { value: '添付ファイル' }, //フィールド名
      },
      font: {
        /*
        id: { value: 2589 },
        recordId: { value: 8 }, //レコード
        attachment: { value: '添付ファイル' }, //フィールド名
        */
        url: { value: 'https://scs199204.github.io/pdflib_test/public/fonts/GenShinGothic-P-Regular.ttf' },
      },
    },
    text: [
      {
        fieldCode: '会社名',
        x: 100,
        y: 755,
        size: 12,
        align: 'left',
        targetPage: 'all',
      },
      {
        fieldCode: '担当者名',
        x: 110,
        y: 735,
        size: 12,
        targetPage: 'first',
      },
      {
        fieldCode: '請求番号',
        x: 390,
        y: 728,
        size: 10,
        color: { red: 255, green: 0, blue: 0 },
      },
      {
        fieldCode: '請求金額',
        x: 220,
        y: 620,
        size: 16,
        postFix: '円',
        format: ['comma'],
        align: 'right', //align:rightの場合、揃える右端を指定
        targetPage: 'last',
      },
    ],
    pageCount: {
      x: 300,
      y: 10,
      size: 12,
      type: 'n/n',
    },
    image: [
      {
        fieldCode: 'サイン画像',
        x: 385,
        y: 175,
        width: 110,
      },
    ],
    table: [
      {
        fieldCode: '請求情報',
        maxRow: 10,
        y: 150, //開始位置
        y_Offset: 1,
        y_OffsetFontSize: true,
        targetPage: 'last',
        column: [
          {
            fieldCode: '処理日',
            x: 80,
            size: 12,
          },
          {
            fieldCode: '内容',
            x: 180,
            size: 12,
            color: { red: 0, green: 255, blue: 0 },
          },
        ],
      },
    ],
    pageBreakTable: {
      fieldCode: '請求明細',
      maxRow: 17,
      y: 503, //開始位置
      y_Offset: 14.8,
      subtotal: true,
      column: [
        {
          fieldCode: '項目',
          x: 83,
          size: 12,
          maxWidth: 210,
          subtotal: 'count',
        },
        {
          fieldCode: '数量',
          x: 337,
          size: 12,
          format: ['comma'],
          align: 'right',
        },
        {
          fieldCode: '単位',
          x: 342,
          size: 12,
          color: { red: 0, green: 0, blue: 255 },
        },
        {
          fieldCode: '単価',
          x: 425,
          size: 12,
          format: ['comma'],
          align: 'right',
          subtotal: 'count',
        },
        {
          fieldCode: '金額',
          x: 510,
          size: 12,
          format: ['comma'],
          align: 'right',
          subtotal: 'sum',
        },
      ],
    },
  };
})();
