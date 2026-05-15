'use client'

import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'

const DM_TOKEN_KEY = 'valkaria:dmToken'

const httpLink = createHttpLink({
  uri: process.env['NEXT_PUBLIC_GRAPHQL_URL'] ?? 'http://localhost:3001/graphql',
  credentials: 'include',
})

const authLink = setContext((_, { headers }) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem(DM_TOKEN_KEY) : null
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  }
})

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
    query: { fetchPolicy: 'network-only' },
  },
})
