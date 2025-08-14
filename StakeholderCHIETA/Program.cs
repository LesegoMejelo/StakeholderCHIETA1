using StakeholderCHIETA.Models;
using Microsoft.EntityFrameworkCore;
using Google.Cloud.Firestore;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Microsoft.AspNetCore.Builder.Extensions;

var builder = WebApplication.CreateBuilder(args);

// ?? Get path from environment variable
var serviceAccountPath = @"C:\Users\27658\source\repos\StakeholderApp\adminsdk.json";

if (!File.Exists(serviceAccountPath))
{
    throw new FileNotFoundException($"Firebase service account key file not found at: {serviceAccountPath}");
}

// ?? Initialize Firebase
FirebaseApp.Create(new AppOptions()
{
    Credential = GoogleCredential.FromFile(serviceAccountPath)
});

// Add services to the container
builder.Services.AddControllersWithViews();

builder.Services.AddDbContext<EnquiryDBContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("EnquiryConnection")));

// ?? Register FirestoreDb for Dependency Injection
builder.Services.AddSingleton(provider =>
{
    string path = @"C:\Users\27658\source\repos\StakeholderApp\adminsdk.json"; // Full path to your key file
    Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", path);
    return FirestoreDb.Create("stakeholder-app-57ed0");
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Home}/{id?}"
);

app.Run();
