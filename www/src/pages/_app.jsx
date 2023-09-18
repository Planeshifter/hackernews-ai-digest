import Head from 'next/head'
import { ThemeProvider } from 'next-themes'
import { MDXProvider } from '@mdx-js/react'
import { Analytics } from '@vercel/analytics/react';

import { Layout } from '@/components/Layout'
import * as mdxComponents from '@/components/mdx'

import '@/styles/tailwind.css'
import 'focus-visible'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Hacker News Daily AI Digest</title>
        <meta
          name="description"
          content="Stay updated with the latest AI news and discussions with Hacker News Daily AI Digest, curating top stories on artificial intelligence every day."
        />
      </Head>
      <ThemeProvider attribute="class" disableTransitionOnChange>
        <MDXProvider components={mdxComponents}>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </MDXProvider>
      </ThemeProvider>
      <Analytics />
    </>
  )
}
