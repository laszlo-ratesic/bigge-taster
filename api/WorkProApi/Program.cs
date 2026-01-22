using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddHttpClient();

var app = builder.Build();
app.UseCors();

// Salesforce config
var sfConfig = new SalesforceConfig
{
    InstanceUrl = Environment.GetEnvironmentVariable("SF_INSTANCE_URL") ?? "",
    ClientId = Environment.GetEnvironmentVariable("SF_CLIENT_ID") ?? "",
    Username = Environment.GetEnvironmentVariable("SF_USERNAME") ?? "",
    PrivateKeyPath = Environment.GetEnvironmentVariable("SF_PRIVATE_KEY_PATH") ?? "server.key"
};

var jobs = new List<ServiceJob>
{
    new ServiceJob
    {
        Id = "WO-2025-001",
        WorkOrderNumber = "WO-2025-001",
        CustomerName = "Turner Construction",
        SiteAddress = "4200 Westheimer Rd, Houston, TX 77027",
        EquipmentType = "Crane",
        EquipmentModel = "Liebherr LTM 1300-6.2",
        Status = "Dispatched",
        Priority = "High",
        ScheduledDate = DateTime.Now.AddHours(2),
        TechnicianName = "Marcus Johnson",
        JobType = "Dispatch",
        Notes = "Customer requested early morning delivery. Site contact: Jim @ 713-555-0142"
    },
    new ServiceJob
    {
        Id = "WO-2025-002",
        WorkOrderNumber = "WO-2025-002",
        CustomerName = "Kiewit Infrastructure",
        SiteAddress = "1200 Smith St, Houston, TX 77002",
        EquipmentType = "Crane",
        EquipmentModel = "Grove GMK5250L",
        Status = "In Progress",
        Priority = "Medium",
        ScheduledDate = DateTime.Now.AddHours(-1),
        TechnicianName = "David Chen",
        JobType = "Service",
        Notes = "Hydraulic inspection and fluid top-off. Unit reported slow boom extension."
    },
    new ServiceJob
    {
        Id = "WO-2025-003",
        WorkOrderNumber = "WO-2025-003",
        CustomerName = "McCarthy Building",
        SiteAddress = "800 Bell St, Houston, TX 77002",
        EquipmentType = "Rigging",
        EquipmentModel = "Modulift Spreader Beam 50T",
        Status = "En Route",
        Priority = "Urgent",
        ScheduledDate = DateTime.Now.AddMinutes(45),
        TechnicianName = "Marcus Johnson",
        JobType = "Rigging",
        Notes = "HVAC unit lift - 42 tons. Rigging plan approved. Safety meeting at 0600."
    },
    new ServiceJob
    {
        Id = "WO-2025-004",
        WorkOrderNumber = "WO-2025-004",
        CustomerName = "Fluor Corporation",
        SiteAddress = "3 Greenway Plaza, Houston, TX 77046",
        EquipmentType = "Crane",
        EquipmentModel = "Tadano GR-1000XL",
        Status = "Complete",
        Priority = "Low",
        ScheduledDate = DateTime.Now.AddDays(-1),
        TechnicianName = "Sarah Martinez",
        JobType = "Inspection",
        Notes = "Annual OSHA inspection complete. All certifications updated in D365."
    },
    new ServiceJob
    {
        Id = "WO-2025-005",
        WorkOrderNumber = "WO-2025-005",
        CustomerName = "Bechtel Oil & Gas",
        SiteAddress = "5795 N Sam Houston Pkwy W, Houston, TX 77086",
        EquipmentType = "Crane",
        EquipmentModel = "Liebherr LR 1800-1.0",
        Status = "Dispatched",
        Priority = "High",
        ScheduledDate = DateTime.Now.AddHours(4),
        TechnicianName = "David Chen",
        JobType = "Dispatch",
        Notes = "Crawler crane mobilization. Permit secured. Escort required for transport."
    }
};

var jobCounter = 6;
string? sfAccessToken = null;

// Load RSA private key from PEM file
RSA LoadPrivateKey(string path)
{
    var keyText = File.ReadAllText(path);
    var rsa = RSA.Create();
    rsa.ImportFromPem(keyText.ToCharArray());
    return rsa;
}

// JWT Bearer Flow
async Task<string?> GetSalesforceToken(HttpClient httpClient)
{
    if (!string.IsNullOrEmpty(sfAccessToken)) return sfAccessToken;
    if (string.IsNullOrEmpty(sfConfig.ClientId)) return null;

    try
    {
        var rsa = LoadPrivateKey(sfConfig.PrivateKeyPath);
        var signingCredentials = new SigningCredentials(
            new RsaSecurityKey(rsa),
            SecurityAlgorithms.RsaSha256
        );

        var now = DateTime.UtcNow;
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Iss, sfConfig.ClientId),
            new Claim(JwtRegisteredClaimNames.Sub, sfConfig.Username),
            new Claim(JwtRegisteredClaimNames.Aud, "https://login.salesforce.com"),
            new Claim(JwtRegisteredClaimNames.Exp, new DateTimeOffset(now.AddMinutes(3)).ToUnixTimeSeconds().ToString())
        };

        var token = new JwtSecurityToken(
            claims: claims,
            signingCredentials: signingCredentials
        );

        var tokenHandler = new JwtSecurityTokenHandler();
        var assertion = tokenHandler.WriteToken(token);

        var tokenUrl = "https://login.salesforce.com/services/oauth2/token";
        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "urn:ietf:params:oauth:grant-type:jwt-bearer",
            ["assertion"] = assertion
        });

        var response = await httpClient.PostAsync(tokenUrl, content);
        var responseBody = await response.Content.ReadAsStringAsync();
        
        if (!response.IsSuccessStatusCode)
        {
            Console.WriteLine($"SF Auth Failed: {responseBody}");
            return null;
        }

        var json = JsonSerializer.Deserialize<JsonElement>(responseBody);
        sfAccessToken = json.GetProperty("access_token").GetString();
        Console.WriteLine("Salesforce authenticated successfully!");
        return sfAccessToken;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"SF Auth Exception: {ex.Message}");
        return null;
    }
}

// Sync job to Salesforce as a Case
async Task SyncToSalesforce(HttpClient httpClient, ServiceJob job)
{
    var token = await GetSalesforceToken(httpClient);
    if (token == null) return;

    var caseData = new
    {
        Subject = $"{job.WorkOrderNumber} - {job.JobType} - {job.CustomerName}",
        Description = $"Equipment: {job.EquipmentModel}\nAddress: {job.SiteAddress}\nTechnician: {job.TechnicianName}\n\nNotes: {job.Notes}",
        Status = job.Status == "Complete" ? "Closed" : "New",
        Priority = job.Priority,
        Origin = "WorkPro Mobile"
    };

    var request = new HttpRequestMessage(HttpMethod.Post, $"{sfConfig.InstanceUrl}/services/data/v59.0/sobjects/Case");
    request.Headers.Add("Authorization", $"Bearer {token}");
    request.Content = JsonContent.Create(caseData);

    var response = await httpClient.SendAsync(request);
    if (response.IsSuccessStatusCode)
    {
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        Console.WriteLine($"Synced to Salesforce: {result.GetProperty("id")}");
    }
    else
    {
        Console.WriteLine($"SF Sync Failed: {await response.Content.ReadAsStringAsync()}");
    }
}

app.MapGet("/", () => "WorkPro API v1.0 - Bigge Crane and Rigging");

app.MapGet("/api/jobs", () => jobs);

app.MapGet("/api/jobs/{id}", (string id) =>
{
    var job = jobs.FirstOrDefault(j => j.Id == id);
    return job is not null ? Results.Ok(job) : Results.NotFound();
});

app.MapPost("/api/jobs", async (CreateJobRequest request, IHttpClientFactory httpClientFactory) =>
{
    var id = $"WO-2025-{jobCounter++:D3}";
    var job = new ServiceJob
    {
        Id = id,
        WorkOrderNumber = id,
        CustomerName = request.CustomerName,
        SiteAddress = request.SiteAddress,
        EquipmentType = request.EquipmentType,
        EquipmentModel = request.EquipmentModel,
        Status = "Dispatched",
        Priority = request.Priority,
        ScheduledDate = request.ScheduledDate,
        TechnicianName = request.TechnicianName,
        JobType = request.JobType,
        Notes = request.Notes ?? ""
    };
    jobs.Add(job);

    // Sync to Salesforce
    var httpClient = httpClientFactory.CreateClient();
    await SyncToSalesforce(httpClient, job);

    return Results.Created($"/api/jobs/{id}", job);
});

app.MapPut("/api/jobs/{id}", (string id, CreateJobRequest request) =>
{
    var job = jobs.FirstOrDefault(j => j.Id == id);
    if (job is null) return Results.NotFound();

    job.CustomerName = request.CustomerName;
    job.SiteAddress = request.SiteAddress;
    job.EquipmentType = request.EquipmentType;
    job.EquipmentModel = request.EquipmentModel;
    job.Priority = request.Priority;
    job.ScheduledDate = request.ScheduledDate;
    job.TechnicianName = request.TechnicianName;
    job.JobType = request.JobType;
    job.Notes = request.Notes ?? "";

    return Results.Ok(job);
});

app.MapPatch("/api/jobs/{id}/status", (string id, StatusUpdate update) =>
{
    var job = jobs.FirstOrDefault(j => j.Id == id);
    if (job is null) return Results.NotFound();
    job.Status = update.Status;
    return Results.Ok(job);
});

app.MapDelete("/api/jobs/{id}", (string id) =>
{
    var job = jobs.FirstOrDefault(j => j.Id == id);
    if (job is null) return Results.NotFound();
    jobs.Remove(job);
    return Results.NoContent();
});

app.MapGet("/api/salesforce/status", async (IHttpClientFactory httpClientFactory) =>
{
    var httpClient = httpClientFactory.CreateClient();
    var token = await GetSalesforceToken(httpClient);
    return token != null 
        ? Results.Ok(new { connected = true, instance = sfConfig.InstanceUrl }) 
        : Results.Ok(new { connected = false, error = "Could not authenticate" });
});

// Pull cases from Salesforce
app.MapGet("/api/salesforce/cases", async (IHttpClientFactory httpClientFactory) =>
{
    var httpClient = httpClientFactory.CreateClient();
    var token = await GetSalesforceToken(httpClient);
    if (token == null) return Results.Ok(new { error = "Not authenticated" });

    var query = "SELECT Id, CaseNumber, Subject, Description, Status, Priority, Origin, CreatedDate FROM Case WHERE Origin = 'WorkPro Mobile' ORDER BY CreatedDate DESC LIMIT 20";
    var url = $"{sfConfig.InstanceUrl}/services/data/v59.0/query?q={Uri.EscapeDataString(query)}";

    var request = new HttpRequestMessage(HttpMethod.Get, url);
    request.Headers.Add("Authorization", $"Bearer {token}");

    var response = await httpClient.SendAsync(request);
    if (!response.IsSuccessStatusCode)
    {
        var error = await response.Content.ReadAsStringAsync();
        Console.WriteLine($"SF Query Failed: {error}");
        return Results.Ok(new { error = "Query failed" });
    }

    var result = await response.Content.ReadFromJsonAsync<JsonElement>();
    return Results.Ok(result);
});

// Fetch jobs from Salesforce (maps Cases back to ServiceJob format)
app.MapGet("/api/jobs/from-salesforce", async (IHttpClientFactory httpClientFactory) =>
{
    var httpClient = httpClientFactory.CreateClient();
    var token = await GetSalesforceToken(httpClient);
    if (token == null) return Results.Ok(new List<object>());

    var query = @"SELECT Id, CaseNumber, Subject, Description, Status, Priority, CreatedDate 
                  FROM Case 
                  WHERE Origin = 'WorkPro Mobile' 
                  ORDER BY CreatedDate DESC 
                  LIMIT 20";
    
    var url = $"{sfConfig.InstanceUrl}/services/data/v59.0/query?q={Uri.EscapeDataString(query)}";

    var request = new HttpRequestMessage(HttpMethod.Get, url);
    request.Headers.Add("Authorization", $"Bearer {token}");

    var response = await httpClient.SendAsync(request);
    if (!response.IsSuccessStatusCode)
    {
        Console.WriteLine($"SF Query Failed: {await response.Content.ReadAsStringAsync()}");
        return Results.Ok(new List<object>());
    }

    var result = await response.Content.ReadFromJsonAsync<JsonElement>();
    var records = result.GetProperty("records");
    
    var sfJobs = new List<object>();
    foreach (var record in records.EnumerateArray())
    {
        // Parse subject: "WO-2025-006 - Dispatch - Turner Construction"
        var subject = record.GetProperty("Subject").GetString() ?? "";
        var parts = subject.Split(" - ");
        
        var description = record.TryGetProperty("Description", out var desc) && desc.ValueKind != JsonValueKind.Null 
            ? desc.GetString() ?? "" 
            : "";
        
        // Parse description to extract fields
        var lines = description.Split('\n');
        var equipment = "";
        var address = "";
        var technician = "";
        var notes = "";
        
        foreach (var line in lines)
        {
            if (line.StartsWith("Equipment:")) equipment = line.Replace("Equipment:", "").Trim();
            else if (line.StartsWith("Address:")) address = line.Replace("Address:", "").Trim();
            else if (line.StartsWith("Technician:")) technician = line.Replace("Technician:", "").Trim();
            else if (line.StartsWith("Notes:")) notes = line.Replace("Notes:", "").Trim();
        }

        // Map Salesforce status to app status
        var sfStatus = record.GetProperty("Status").GetString() ?? "New";
        var appStatus = sfStatus switch
        {
            "New" => "Dispatched",
            "Working" => "In Progress",
            "Escalated" => "En Route",
            "Closed" => "Complete",
            _ => "Dispatched"
        };

        sfJobs.Add(new
        {
            id = record.GetProperty("Id").GetString(),
            workOrderNumber = parts.Length > 0 ? parts[0] : record.GetProperty("CaseNumber").GetString(),
            customerName = parts.Length > 2 ? parts[2] : "Unknown",
            siteAddress = address,
            equipmentType = equipment.Contains("Crane") ? "Crane" : "Rigging",
            equipmentModel = equipment,
            status = appStatus,
            priority = record.GetProperty("Priority").GetString() ?? "Medium",
            scheduledDate = record.GetProperty("CreatedDate").GetString(),
            technicianName = technician,
            jobType = parts.Length > 1 ? parts[1] : "Dispatch",
            notes = notes,
            source = "salesforce"
        });
    }

    return Results.Ok(sfJobs);
});

// Fetch single job from Salesforce
app.MapGet("/api/jobs/from-salesforce/{id}", async (string id, IHttpClientFactory httpClientFactory) =>
{
    var httpClient = httpClientFactory.CreateClient();
    var token = await GetSalesforceToken(httpClient);
    if (token == null) return Results.NotFound();

    var query = $"SELECT Id, CaseNumber, Subject, Description, Status, Priority, CreatedDate FROM Case WHERE Id = '{id}'";
    var url = $"{sfConfig.InstanceUrl}/services/data/v59.0/query?q={Uri.EscapeDataString(query)}";

    var request = new HttpRequestMessage(HttpMethod.Get, url);
    request.Headers.Add("Authorization", $"Bearer {token}");

    var response = await httpClient.SendAsync(request);
    if (!response.IsSuccessStatusCode) return Results.NotFound();

    var result = await response.Content.ReadFromJsonAsync<JsonElement>();
    var records = result.GetProperty("records");
    
    if (records.GetArrayLength() == 0) return Results.NotFound();

    var record = records[0];
    var subject = record.GetProperty("Subject").GetString() ?? "";
    var parts = subject.Split(" - ");
    
    var description = record.TryGetProperty("Description", out var desc) && desc.ValueKind != JsonValueKind.Null 
        ? desc.GetString() ?? "" 
        : "";
    
    var lines = description.Split('\n');
    var equipment = "";
    var address = "";
    var technician = "";
    var notes = "";
    
    foreach (var line in lines)
    {
        if (line.StartsWith("Equipment:")) equipment = line.Replace("Equipment:", "").Trim();
        else if (line.StartsWith("Address:")) address = line.Replace("Address:", "").Trim();
        else if (line.StartsWith("Technician:")) technician = line.Replace("Technician:", "").Trim();
        else if (line.StartsWith("Notes:")) notes = line.Replace("Notes:", "").Trim();
    }

    var sfStatus = record.GetProperty("Status").GetString() ?? "New";
    var appStatus = sfStatus switch
    {
        "New" => "Dispatched",
        "Working" => "In Progress",
        "Escalated" => "En Route",
        "Closed" => "Complete",
        _ => "Dispatched"
    };

    return Results.Ok(new
    {
        id = record.GetProperty("Id").GetString(),
        workOrderNumber = parts.Length > 0 ? parts[0] : record.GetProperty("CaseNumber").GetString(),
        customerName = parts.Length > 2 ? parts[2] : "Unknown",
        siteAddress = address,
        equipmentType = equipment.Contains("Crane") ? "Crane" : "Rigging",
        equipmentModel = equipment,
        status = appStatus,
        priority = record.GetProperty("Priority").GetString() ?? "Medium",
        scheduledDate = record.GetProperty("CreatedDate").GetString(),
        technicianName = technician,
        jobType = parts.Length > 1 ? parts[1] : "Dispatch",
        notes = notes,
        source = "salesforce"
    });
});

// Update Salesforce Case status
app.MapPatch("/api/jobs/from-salesforce/{id}/status", async (string id, StatusUpdate update, IHttpClientFactory httpClientFactory) =>
{
    var httpClient = httpClientFactory.CreateClient();
    var token = await GetSalesforceToken(httpClient);
    if (token == null) return Results.BadRequest(new { error = "Not authenticated to Salesforce" });

    // Map app status to Salesforce status
    var sfStatus = update.Status switch
    {
        "Dispatched" => "New",
        "En Route" => "Escalated",
        "In Progress" => "Working",
        "Complete" => "Closed",
        _ => "New"
    };

    var caseUpdate = new { Status = sfStatus };
    
    var request = new HttpRequestMessage(HttpMethod.Patch, $"{sfConfig.InstanceUrl}/services/data/v59.0/sobjects/Case/{id}");
    request.Headers.Add("Authorization", $"Bearer {token}");
    request.Content = JsonContent.Create(caseUpdate);

    var response = await httpClient.SendAsync(request);
    if (!response.IsSuccessStatusCode)
    {
        var error = await response.Content.ReadAsStringAsync();
        Console.WriteLine($"SF Update Failed: {error}");
        return Results.BadRequest(new { error = "Failed to update Salesforce" });
    }

    Console.WriteLine($"Updated Salesforce Case {id} to status: {sfStatus}");
    return Results.Ok(new { success = true, status = update.Status });
});

app.Run();

public class ServiceJob
{
    public string Id { get; set; } = "";
    public string WorkOrderNumber { get; set; } = "";
    public string CustomerName { get; set; } = "";
    public string SiteAddress { get; set; } = "";
    public string EquipmentType { get; set; } = "";
    public string EquipmentModel { get; set; } = "";
    public string Status { get; set; } = "";
    public string Priority { get; set; } = "";
    public DateTime ScheduledDate { get; set; }
    public string TechnicianName { get; set; } = "";
    public string JobType { get; set; } = "";
    public string Notes { get; set; } = "";
}

public record CreateJobRequest(
    string CustomerName,
    string SiteAddress,
    string EquipmentType,
    string EquipmentModel,
    string Priority,
    DateTime ScheduledDate,
    string TechnicianName,
    string JobType,
    string? Notes
);

public record StatusUpdate(string Status);

public class SalesforceConfig
{
    public string InstanceUrl { get; set; } = "";
    public string ClientId { get; set; } = "";
    public string Username { get; set; } = "";
    public string PrivateKeyPath { get; set; } = "";
}