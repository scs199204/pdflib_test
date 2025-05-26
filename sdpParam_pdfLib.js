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
        id: { value: 2589 },
        recordId: { value: 8 }, //レコード
        attachment: { value: '添付ファイル' }, //フィールド名
      },
    },
    text: [
      {
        fieldCode: '会社名',
        x: 100,
        y: 750,
        size: 12,
        align: 'left',
      },
      {
        fieldCode: '担当者名',
        x: 110,
        y: 730,
        size: 12,
      },
      {
        fieldCode: '請求番号',
        x: 390,
        y: 730,
        size: 10,
        color: { red: 255, green: 0, blue: 0 },
      },
      {
        fieldCode: '請求金額',
        x: 220,
        y: 625,
        size: 16,
        postFix: '円',
        format: ['comma'],
        align: 'right', //align:rightの場合、揃える右端を指定
      },
    ],
    image: [
      {
        fieldCode: 'サイン画像',
        x: 400,
        y: 200,
        width: 0.2, //元の画像に対する割合
      },
    ],
    table: [
      {
        fieldCode: '請求情報',
        maxRow: 10,
        y: 150, //開始位置
        y_Offset: 1,
        y_OffsetFontSize: true,
        row: [
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
      y: 507, //開始位置
      y_Offset: 14.6,
      row: [
        {
          fieldCode: '項目',
          x: 80,
          size: 12,
          maxWidth: 210,
        },
        {
          fieldCode: '数量',
          x: 335,
          size: 12,
          format: ['comma'],
          align: 'right',
        },
        {
          fieldCode: '単位',
          x: 340,
          size: 12,
          color: { red: 0, green: 0, blue: 255 },
        },
        {
          fieldCode: '単価',
          x: 420,
          size: 12,
          format: ['comma'],
          align: 'right',
        },
        {
          fieldCode: '金額',
          x: 485,
          size: 12,
          format: ['comma'],
          align: 'right',
        },
      ],
    },
  };
})();
