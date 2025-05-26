import { defineConfig } from 'vite';

export default defineConfig({
  base: '/pdflib_test/',
  build: {
    // ソースマップの設定はそのまま
    sourcemap: true,
    rollupOptions: {
      output: {
        // エントリーポイントのチャンク（通常はmain.jsなど）のファイル名
        // [name] は元のファイル名（例: main）
        // [hash] はコンテンツハッシュ
        // kintone向けには、シンプルなファイル名が良いでしょう
        //entryFileNames: `[name].js`, // 例: main.js
        // もしくは、固定のファイル名にする場合
        // entryFileNames: `kintone-customization.js`, // 例: kintone-customization.js

        // その他のチャンク（importされたライブラリなど、自動で分割されるコード）のファイル名
        //chunkFileNames: `[name]-[hash].js`,

        // アセット（画像、CSSなど）のファイル名
        //assetFileNames: `[name]-[hash][extname]`,
        entryFileNames: `[name].js`,
        chunkFileNames: `[name]-[hash].js`,
        assetFileNames: `[name]-[hash].[ext]`,
      },
    },
  },
});
