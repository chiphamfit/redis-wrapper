
export async function createClient(mongoClient, redisClient) {
  const client = await db.createWrapperClient(mongoClient, redisClient);
  return new wrapper(client);
}
