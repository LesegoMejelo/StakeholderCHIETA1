using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Linq;
using System.Threading.Tasks;

namespace StakeholderCHIETA
{
    public class AuthorizeAdminAttribute : TypeFilterAttribute
    {
        public AuthorizeAdminAttribute() : base(typeof(AdminAuthFilter)) { }
    }

    public class AdminAuthFilter : IAsyncActionFilter
    {
        private readonly FirebaseAuth _auth;
        private readonly FirestoreDb _firestoreDb;

        public AdminAuthFilter(FirebaseAuth auth, FirestoreDb firestoreDb)
        {
            _auth = auth;
            _firestoreDb = firestoreDb;
        }

        public async Task OnActionExecutionAsync (ActionExecutingContext context, ActionExecutionDelegate next)
        {
            // Get ID token from request headers
            var header = context.HttpContext.Request.Headers["Authorization"].FirstOrDefault();
            if (header == null || !header.StartsWith("Bearer"))
            {
                context.Result = new UnauthorizedResult();
                return;
            }
            var idToken = header.Substring("Bearer ".Length);

            try
            {
                //verify token with firebase admin sdk
                FirebaseToken decodedToken = await _auth.VerifyIdTokenAsync(idToken);
                string uid = decodedToken.Uid;

                //check if user is an admin in firestore
                var adminDocRef = _firestoreDb.Collection("Admin").Document(uid);
                var adminDoc = await adminDocRef.GetSnapshotAsync();

                if(!adminDoc.Exists)
                {
                    context.Result = new ForbidResult(); //if user is not an admin, return 403 Forbidden
                    return;
                }
                await next(); //proceed with controller action
            }
            catch
            {
                context.Result = new UnauthorizedResult();
                return;
            }
        }
    }
}
