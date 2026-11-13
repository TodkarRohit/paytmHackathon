/**
 * Per-Conversation Asynchronous FIFO Mutex / Lock
 * 
 * Prevents read-modify-write race conditions when multiple chat requests
 * target the same conversation simultaneously.
 * 
 * Each conversation has an independent execution queue.
 * Concurrent requests for different conversations proceed in parallel without blocking.
 * 
 * Note: Suitable for the current single-server architecture. For a distributed
 * multi-server cluster, a distributed Redis-based locking solution (such as Redlock)
 * would be recommended.
 */

class ConversationMutex {
  constructor() {
    this.queues = new Map()
  }

  /**
   * Execute an async function sequentially within the specified conversation lock.
   * 
   * @param {string} key Unique lock key (e.g. conversationId or shopkeeperId)
   * @param {Function} task Async function returning a promise
   * @returns {Promise<any>}
   */
  async run(key, task) {
    if (!key) {
      return task()
    }

    const stringKey = String(key)

    // Retrieve current chain or start with an immediately resolved promise
    const previousPromise = this.queues.get(stringKey) || Promise.resolve()

    // Chain the new task to run strictly after the previous task finishes (even if it failed)
    const currentPromise = previousPromise
      .catch(() => {}) // Prevent previous errors from crashing the next queued task
      .then(async () => {
        return await task()
      })

    this.queues.set(stringKey, currentPromise)

    try {
      return await currentPromise
    } finally {
      // Clean up Map entry when the queue has drained to prevent memory leaks
      if (this.queues.get(stringKey) === currentPromise) {
        this.queues.delete(stringKey)
      }
    }
  }

  /**
   * Return number of currently active queues (useful for telemetry / testing)
   */
  getActiveQueueCount() {
    return this.queues.size
  }
}

export const conversationMutex = new ConversationMutex()
export default conversationMutex

