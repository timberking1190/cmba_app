/* THIS FILE WAS GENERATED FOLLOWING THE PAYLOAD 3 NEXT APP TEMPLATE.
 * It provides the root layout for the Payload admin panel and REST/GraphQL API.
 * The admin panel renders its own <html>/<body>, so this group does NOT inherit
 * the public-site chrome (Header/Footer/MobileNav live under (frontend)).
 */
import type { ServerFunctionClient } from 'payload'
import config from '@payload-config'
import '@payloadcms/next/css'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import React from 'react'

import { importMap } from './admin/importMap.js'
import './custom.scss'

type Args = {
  children: React.ReactNode
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
)

export default Layout
