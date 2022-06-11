export class Logger {
  name: string
  constructor(name: string) {
    this.name = name
  }

  /**
   * Create stack trace  the lines of least Logger.
   * @returns {string}
   */
  public static createStack(): string {
    let stack = new Error().stack
    stack = stack ? stack.replace('Error\n', '') : ''

    return stack
      .split('\n')
      .filter((line, index) => index >= 2)
      .join('\n')
  }

  /**
   * @param data
   * @returns {any}
   */
  public debug(...data: any[]): Logger {
    return this.write('debug', data)
  }

  /**
   *
   * @param data
   * @returns {any}
   */
  public info(...data: any[]): Logger {
    return this.write('info', data)
  }

  /**
   *
   * @param data
   * @returns {any}
   */
  public warn(...data: any[]): Logger {
    return this.write('warn', data)
  }

  /**
   * Prints to stderr with newline. Multiple arguments can be passed, with the first used as the primary
   * message and all additional used as substitution values similar to printf() (the arguments are all
   * passed to util.format()).
   * @param data
   * @param args
   * @returns {any}
   */
  public error(...data: any[]): Logger {
    return this.write('error', data)
  }

  /**
   *
   * @param data
   * @returns {Logger}
   */
  public trace(...data: any[]): Logger {
    const stack = '\n' + Logger.createStack() + '\n'
    data.push(stack)
    return this.write('trace', data)
  }

  /**
   *
   * @returns {Logger}
   */
  private write(type: 'debug' | 'info' | 'trace' | 'error' | 'warn', data: any[]): Logger {
    const datatime = new Date().toLocaleString()
    const name = this.name ? ` [${this.name}] ` : ''
    console[type](`[${datatime}]${name}[${type}] -`, ...data)
    return this
  }
}

export const logger = new Logger('')
