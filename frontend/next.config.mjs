/** @type {import('next/dist/next-server/server/config').NextConfig} */
export default {
    async rewrites() {
      return [
        {
          source: '/merge-pdfs/',
          destination: 'http://localhost:8000/merge-pdfs/'
        }
      ];
    }
  };