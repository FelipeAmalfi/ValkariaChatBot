export const healthResolver = {
  Query: {
    health: () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    }),
  },
}
