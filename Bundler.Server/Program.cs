using Bundler.Server.Controllers;

public partial class Program
{
    public static void Main(string[] args)
    {
        try
        {
            BundlerCompileController.Validate();
        }
        catch (Exception e)
        {
            Console.WriteLine(e.Message);
            return;
        }

        var builder = WebApplication.CreateBuilder(args);

        // Add services to the container.

        builder.Services.AddControllers();
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        var app = builder.Build();

        app.UseDefaultFiles();
        app.UseStaticFiles();

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseHttpsRedirection();

        app.UseAuthorization();

        app.MapControllers();

        app.MapFallbackToFile("/index.html");

        app.Run();
    }

    public void Configure()
    { }
}
