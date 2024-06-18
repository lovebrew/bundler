using System.Runtime.Serialization;

using Tomlyn;

namespace Bundler.QA.Common
{
    public enum ConfigSection
    {
        Metadata,
        Build,
        Debug
    }

    public enum ConfigSectionField
    {
        Title,
        Author,
        Description,
        Version,
        Icons,
        Targets,
        Source,
        Packaged
    }

    public enum ConfigIconType
    {
        CTR,
        HAC,
        CAFE
    }

    public sealed class Metadata
    {
        public string? Title { get; set; }
        public string? Author { get; set; }
        public string? Description { get; set; }
        public string? Version { get; set; }
        public Dictionary<string, string>? Icons { get; set; }

        public Metadata() 
            => this.Icons = [];

        [IgnoreDataMember]
        public dynamic? this[ConfigSectionField key]
        {
            get => key switch
            {
                ConfigSectionField.Title => this.Title,
                ConfigSectionField.Author => this.Author,
                ConfigSectionField.Description => this.Description,
                ConfigSectionField.Version => this.Version,
                ConfigSectionField.Icons => this.Icons,
                _ => null
            };

            set
            {
                switch (key)
                {
                    case ConfigSectionField.Title:
                        this.Title = value;
                        break;
                    case ConfigSectionField.Author:
                        this.Author = value;
                        break;
                    case ConfigSectionField.Description:
                        this.Description = value;
                        break;
                    case ConfigSectionField.Version:
                        this.Version = value;
                        break;
                }
            }
        }

        public void SetIcon(ConfigIconType type, string filename)
        {
            if (this.Icons is null) return;
            
            switch (type)
            {
                case ConfigIconType.CTR:
                    this.Icons["ctr"] = filename;
                    break;
                case ConfigIconType.HAC:
                    this.Icons["hac"] = filename;
                    break;
                case ConfigIconType.CAFE:
                    this.Icons["cafe"] = filename;
                    break;
            }
        }
    }

    public sealed class Build
    {
        public List<string>? Targets { get; set; }
        public string? Source { get; set; }
        public bool? Packaged { get; set; }

        public Build() 
            => this.Targets = [];

        [IgnoreDataMember]
        public dynamic? this[ConfigSectionField key]
        {
            get => key switch
            {
                ConfigSectionField.Targets => this.Targets,
                ConfigSectionField.Source => this.Source,
                ConfigSectionField.Packaged => this.Packaged,
                _ => null
            };

            set
            {
                switch (key)
                {
                    case ConfigSectionField.Targets:
                        this.Targets = value;
                        break;
                    case ConfigSectionField.Source:
                        this.Source = value;
                        break;
                    case ConfigSectionField.Packaged:
                        this.Packaged = value;
                        break;
                }
            }
        }
    }

    public sealed class Debug
    {
        public string? Version { get; set; }
    }

    public class Config
    {
        public Metadata? Metadata { get; set; }
        public Build? Build { get; set; }
        public Debug? Debug { get; set; }

        public byte[] SetField(ConfigSectionField field, dynamic value)
        {
            var content = this.ToString().Trim().Split("\n");
            var fieldString = field.ToString().ToLower();

            for (int i = 0; i < content.Length; i++)
            {
                if (content[i].Contains(fieldString))
                {
                    content[i] = $"{fieldString} = {value}";
                    break;
                }
            }
            
            var updatedContent = string.Join("\n", content);
            return System.Text.Encoding.UTF8.GetBytes(updatedContent);
        }

        [IgnoreDataMember]
        public byte[] Data => System.Text.Encoding.UTF8.GetBytes(this.ToString());

        [IgnoreDataMember]
        public dynamic? this[ConfigSection section]
        {
            get => section switch
            {
                ConfigSection.Metadata => this.Metadata,
                ConfigSection.Build => this.Build,
                ConfigSection.Debug => this.Debug,
                _ => null
            };

            set
            {
                switch (section)
                {
                    case ConfigSection.Metadata:
                        this.Metadata = value;
                        break;
                    case ConfigSection.Build:
                        this.Build = value;
                        break;
                    case ConfigSection.Debug:
                        this.Debug = value;
                        break;
                }
            }
        }

        public override string ToString() => Toml.FromModel(this);
    }
}
