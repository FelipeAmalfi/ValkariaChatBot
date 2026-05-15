'use client'

import { ApolloProvider } from '@apollo/client'
import { apolloClient } from '../graphql/client'
import { AuthProvider } from '../auth/AuthContext'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>{children}</AuthProvider>
    </ApolloProvider>
  )
}
