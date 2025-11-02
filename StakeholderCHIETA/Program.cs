using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;
using Google.Cloud.Firestore.V1;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using StakeholderCHIETA.Models;
using StakeholderCHIETA.Services;

var builder = WebApplication.CreateBuilder(args);

// 🔹 Read Firebase JSON directly from environment variable
var firebaseJson = Environment.GetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS_JSON");

if (string.IsNullOrEmpty(firebaseJson))
{
    throw new Exception(
        "Firebase credentials not found. " +
        "Set the GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable in Azure App Service."
    );
}

// 🔹 Initialize Firebase (only once, reuse if already created)
FirebaseApp app;
if (FirebaseApp.DefaultInstance == null)
{
    app = FirebaseApp.Create(new AppOptions()
    {
        Credential = GoogleCredential.FromJson(firebaseJson)
    });
}
else
{
    app = FirebaseApp.DefaultInstance;
}

// 🔹 Register FirestoreDb for Dependency Injection
builder.Services.AddSingleton(provider =>
{
   //Get the FirebaseApp instance you initialized
    var app = FirebaseApp.DefaultInstance;

    // Build Firestore client using the same credential
    var firestoreClient = new FirestoreClientBuilder
    {
        // Use the credential from FirebaseApp
        Credential = (GoogleCredential)app.Options.Credential
    }.Build();

    return FirestoreDb.Create("stakeholder-app-57ed0", firestoreClient);
});

// Register FirebaseAuth for Dependency Injection
builder.Services.AddSingleton(FirebaseAuth.GetAuth(app));

// Add services to the container
builder.Services.AddControllersWithViews();
builder.Services.AddMemoryCache();

builder.Services.AddScoped<IAppointmentQRService, AppointmentQRService>();
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

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("EmployeeOnly", policy =>
        policy.RequireRole("Admin", "Advisor"));
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireRole("Admin"));
});

builder.Services.Configure<Microsoft.AspNetCore.Mvc.MvcOptions>(options =>
{
    options.EnableEndpointRouting = true;
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
