import { defineConfig } from 'orval'

export default defineConfig({
  send: {
    input: {
      target: '../openapi.json',
    },
    output: {
      target: '../app/api/generated',
      mode: 'tags-split',
      client: 'fetch',
      clean: true,
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
      },
    },
  },
})
