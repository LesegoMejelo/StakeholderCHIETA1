using Google.Cloud.Firestore;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using FirebaseAdmin.Auth;
using Microsoft.AspNetCore.Authentication.Cookies;
using StakeholderCHIETA.Services;


var builder = WebApplication.CreateBuilder(args);

// --- Firebase / Firestore ---
var credsPath = Environment.GetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS")
    ?? throw new FileNotFoundException("Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.");
var firebaseApp = FirebaseApp.DefaultInstance ?? FirebaseApp.Create(new AppOptions
{
    Credential = GoogleCredential.FromFile(credsPath)
});
builder.Services.AddSingleton(_ => FirestoreDb.Create("stakeholder-app-57ed0"));
builder.Services.AddSingleton(FirebaseAuth.GetAuth(firebaseApp));

// --- Framework services ---
builder.Services.AddControllersWithViews();
builder.Services.AddMemoryCache();
builder.Services.AddHttpContextAccessor();

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(o =>
    {
        o.LoginPath = "/Auth/Login";
        o.AccessDeniedPath = "/Auth/Login";
        o.ExpireTimeSpan = TimeSpan.FromMinutes(30);
    });

// --- App services ---
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IQRCodeGenerator, QRCodeService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAppointmentQRService, AppointmentQRService>();

var app = builder.Build();

// --- Pipeline ---
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Auth}/{action=Login}/{id?}");

app.Run();

