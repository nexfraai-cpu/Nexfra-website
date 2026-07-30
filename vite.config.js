export default {
  build: {
    rollupOptions: {
      input: ['index.html', 'erp.html']
    },
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  server: {
    port: 3000,
    open: false
  }
}
