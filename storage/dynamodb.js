import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}))

export function createDynamoStorage() {
  const TABLE = process.env.TABLE_NAME

  return {
    async list() {
      const { Items = [] } = await docClient.send(new ScanCommand({ TableName: TABLE }))
      return Items
    },

    async create(card) {
      await docClient.send(new PutCommand({ TableName: TABLE, Item: card }))
      return card
    },

    async update(id, updates) {
      const entries = Object.entries(updates)
      const UpdateExpression = 'SET ' + entries.map((_, i) => `#k${i} = :v${i}`).join(', ')
      const ExpressionAttributeNames = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]))
      const ExpressionAttributeValues = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]))

      try {
        const { Attributes } = await docClient.send(new UpdateCommand({
          TableName: TABLE,
          Key: { id },
          ConditionExpression: 'attribute_exists(id)',
          UpdateExpression,
          ExpressionAttributeNames,
          ExpressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        }))
        return Attributes
      } catch (e) {
        if (e.name === 'ConditionalCheckFailedException') return null
        throw e
      }
    },

    async delete(id) {
      await docClient.send(new DeleteCommand({ TableName: TABLE, Key: { id } }))
    },
  }
}
