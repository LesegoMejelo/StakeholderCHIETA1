using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Linq;
using System.Threading.Tasks;

namespace StakeholderCHIETA.Filters
{
    public class AuthorizeRoleAttribute : TypeFilterAttribute
    {
        public AuthorizeRoleAttribute(string role) : base(typeof(RoleAuthFilter))
        {
            Arguments = new object[] { role };
        }
    }

    public class RoleAuthFilter : IAsyncActionFilter
    {
        private readonly string _role;
        private readonly FirebaseAuth _auth;
        private readonly FirestoreDb _firestoreDb;

        public RoleAuthFilter(string role, FirebaseAuth auth, FirestoreDb firestoreDb)
        {
            _role = role;
            _auth = auth;
            _firestoreDb = firestoreDb;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            // 1. Get ID token from request headers
            var header = context.HttpContext.Request.Headers["Authorization"].FirstOrDefault();
            if (header == null || !header.StartsWith("Bearer"))
            {
                context.Result = new UnauthorizedResult();
                return;
            }
            var idToken = header.Substring("Bearer ".Length);

            string uid = ""; // Declare uid outside the try block for proper scope

            try
            {
                // 2. Verify token with Firebase Admin SDK
                FirebaseToken decodedToken = await _auth.VerifyIdTokenAsync(idToken);
                uid = decodedToken.Uid; // Assign the value to the uid variable
            }
            catch
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            // 3. Check if the user's document exists in Firestore and their role matches
            var userDocRef = _firestoreDb.Collection("Users").Document(uid);
            var userDoc = await userDocRef.GetSnapshotAsync();

            if (!userDoc.Exists || userDoc.GetValue<string>("role") != _role)
            {
                context.Result = new ForbidResult();
                return;
            }

            await next(); // Proceed to the controller action
        }
    }
}