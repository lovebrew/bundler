namespace Bundler.Server
{
    public class Logger
    {
        private readonly List<string> _logs = [];

        private void Write(string level, string message)
        {
            var timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.ff");
            this._logs.Add($"[{timestamp}] {level} {message}");
        }

        public void LogError(string message)
            => this.Write("ERROR", message);

        public void LogInformation(string message)
            => this.Write("INFO", message);

        public void LogWarning(string message)
            => this.Write("WARNING", message);

        public string GetLogs()
            => string.Join("\n", this._logs);

    }
}