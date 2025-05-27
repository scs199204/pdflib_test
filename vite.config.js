import { defineConfig } from 'vite';

export default defineConfig(({ command, mode }) => {
  // 開発用ビルド設定 (modeが 'development' または 'dev-build' の場合)
  // 'dev-build' は新しいカスタムモード(npm run build:dev)
  if (mode === 'development' || mode === 'dev-build') {
    return {
      base: '/', // ルートパス
      build: {
        sourcemap: 'inline', // インラインソースマップ
        // 開発用ビルドでは rollupOptions の詳細設定は通常不要
        // (ビルド成果物のファイル名をカスタマイズしたい場合にのみ残す)
        rollupOptions: {
          output: {
            entryFileNames: `[name].js`,
            chunkFileNames: `[name]-[hash].js`,
            assetFileNames: `[name]-[hash].[ext]`,
          },
        },
      },
    };
  }

  // 本番用ビルド設定 (modeが 'production' の場合)
  // またはデフォルトのビルド設定として扱う
  return {
    base: '/pdflib_test/', // GitHub Pagesなどのサブディレクトリパス
    build: {
      sourcemap: true, // 外部ソースマップファイル
      rollupOptions: {
        output: {
          entryFileNames: `[name].js`,
          chunkFileNames: `[name]-[hash].js`,
          assetFileNames: `[name]-[hash].[ext]`,
        },
      },
    },
  };
});
