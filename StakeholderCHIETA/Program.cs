
using StakeholderCHIETA.Models;
using Microsoft.EntityFrameworkCore;
using Google.Cloud.Firestore;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Microsoft.AspNetCore.Identity;
using FirebaseAdmin.Auth;
using Microsoft.AspNetCore.Authentication.Cookies;
using StakeholderCHIETA.Services;

var builder = WebApplication.CreateBuilder(args);

// 🔹 Get path from environment variable instead of hardcoding
var serviceAccountPath = Environment.GetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS");

if (string.IsNullOrEmpty(serviceAccountPath) || !File.Exists(serviceAccountPath))
{
    throw new FileNotFoundException(
        "Firebase service account key file not found. " +
        "Set the GOOGLE_APPLICATION_CREDENTIALS environment variable to a valid path."
    );
}

// 🔹 Initialize Firebase (only once, reuse if already created)
FirebaseApp app;
if (FirebaseApp.DefaultInstance == null)
{
    app = FirebaseApp.Create(new AppOptions()
    {
        Credential = GoogleCredential.FromFile(serviceAccountPath)
    });
}
else
{
    app = FirebaseApp.DefaultInstance;
}

// 🔹 Register FirestoreDb for Dependency Injection
builder.Services.AddSingleton(provider =>
{
    return FirestoreDb.Create("stakeholder-app-57ed0"); // your project ID
});

// Register FirebaseAuth for Dependency Injection
builder.Services.AddSingleton(FirebaseAuth.GetAuth(app));

// Add services to the container
builder.Services.AddControllersWithViews();

/* builder.Services.AddScoped<IAppointmentQRService, AppointmentQRService>();*/
builder.Services.AddScoped<IQRCodeGenerator, QRCodeService>();

builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ITokenService, TokenService>();

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Auth/Login";
        options.AccessDeniedPath = "/Auth/Login";
        options.ExpireTimeSpan = TimeSpan.FromMinutes(30);
    });

var appInstance = builder.Build();

// Configure the HTTP request pipeline
if (!appInstance.Environment.IsDevelopment())
{
    appInstance.UseExceptionHandler("/Home/Error");
    appInstance.UseHsts();
}

appInstance.UseHttpsRedirection();
appInstance.UseStaticFiles();

appInstance.UseRouting();

appInstance.UseAuthentication();
appInstance.UseAuthorization();

appInstance.MapControllerRoute(
    name: "default",
    pattern: "{controller=Auth}/{action=Login}/{id?}"
);

appInstance.Run();
