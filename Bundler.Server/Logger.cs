namespace Bundler.Server
{
    /// <summary>
    /// Creates a new simple logger
    /// </summary>
    public class Logger
    {
        private readonly List<string> _logs = [];

        private void Write(string level, string message)
        {
            var timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.ff");
            this._logs.Add($"[{timestamp}] {level} {message}");
        }

        /// <summary>
        /// Logs an error message
        /// </summary>
        /// <param name="message">The message to write</param>
        public void LogError(string message)
            => this.Write("ERROR", message);

        /// <summary>
        /// Logs an information message
        /// </summary>
        /// <param name="message">The message to write</param>
        public void LogInformation(string message)
            => this.Write("INFO", message);

        /// <summary>
        /// Logs a warning message
        /// </summary>
        /// <param name="message">The message to write</param>
        public void LogWarning(string message)
            => this.Write("WARNING", message);

        /// <summary>
        /// Returns all logs as a single string separated by newlines
        /// </summary>
        /// <returns>string</returns>
        public string GetLogs()
            => string.Join("\n", this._logs);

    }
}