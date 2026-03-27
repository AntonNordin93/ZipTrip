using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Logging;
using System.Diagnostics;

namespace ZipTrip.Pages;

public class ErrorModel : PageModel
{
    private readonly ILogger<ErrorModel> _logger;

    public ErrorModel(ILogger<ErrorModel> logger)
    {
        _logger = logger;
    }

    public int? HttpStatusCode { get; set; }
    public string Message { get; set; } = "Ett oväntat fel har inträffat.";
    public string? RequestId { get; set; }
    public bool ShowRequestId => !string.IsNullOrEmpty(RequestId);

    public void OnGet(int? statusCode = null)
    {
        HttpStatusCode = statusCode;
        RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;

        if (statusCode == 404)
        {
            Message = "Sidan du letade efter kunde tyvärr inte hittas. Kontrollera adressen eller prova att gå tillbaka.";
            _logger.LogWarning("404 Not Found - Path: {Path} | RequestId: {RequestId}", Request.Path, RequestId);
        }
        else if (statusCode >= 500)
        {
            Message = "Ett tekniskt fel har inträffat. Vårt team har blivit notifierade och arbetar på att åtgärda det.";
            _logger.LogError("Server error {StatusCode} - Path: {Path} | RequestId: {RequestId}", statusCode, Request.Path, RequestId);
        }
        else
        {
            _logger.LogWarning("Unexpected status code {StatusCode} - Path: {Path}", statusCode, Request.Path);
        }
    }
}