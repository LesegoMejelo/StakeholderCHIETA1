/*
using StakeholderCHIETA.Models;
using Microsoft.EntityFrameworkCore;
using Google.Cloud.Firestore;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Microsoft.AspNetCore.Identity;
using FirebaseAdmin.Auth;

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

// 🔹 Initialize Firebase
FirebaseApp.Create(new AppOptions()
{
    Credential = GoogleCredential.FromFile(serviceAccountPath)
});
// 🔹 Initialize Firebase
FirebaseApp.Create(new AppOptions()
{
    Credential = GoogleCredential.FromFile(serviceAccountPath)
});

// 🔹 Register FirestoreDb for Dependency Injection
builder.Services.AddSingleton(provider =>
{
    return FirestoreDb.Create("stakeholder-app-57ed0"); // your project ID
});

// 🔹 Register FirebaseAuth for Dependency Injection
builder.Services.AddSingleton(FirebaseAuth.DefaultInstance);


// Add services to the container
builder.Services.AddControllersWithViews();

builder.Services.AddDbContext<EnquiryDBContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("EnquiryConnection")));

// 🔹 Register FirestoreDb for Dependency Injection
builder.Services.AddSingleton(provider =>
{
    return FirestoreDb.Create("stakeholder-app-57ed0"); // project ID only
});


var app = builder.Build();

// Configure the HTTP request pipeline
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

//builder.Services.AddDefaultIdentity<IdentityAdmin>

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Auth}/{action=Login}/{id?}"
);

app.Run();
*/
using StakeholderCHIETA.Models;
using Microsoft.EntityFrameworkCore;
using Google.Cloud.Firestore;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Microsoft.AspNetCore.Identity;
using FirebaseAdmin.Auth;

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

// 🔹 Register FirebaseAuth for Dependency Injection
builder.Services.AddSingleton(FirebaseAuth.GetAuth(app));

// Add services to the container
builder.Services.AddControllersWithViews();

builder.Services.AddDbContext<EnquiryDBContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("EnquiryConnection")));

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

appInstance.UseAuthorization();

appInstance.MapControllerRoute(
    name: "default",
    pattern: "{controller=Auth}/{action=Login}/{id?}"
);

appInstance.Run();
