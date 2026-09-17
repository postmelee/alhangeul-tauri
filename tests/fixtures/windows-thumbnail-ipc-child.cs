// Test-only Windows GUI-subsystem receiver, no Tauri, documents, registry or COM.
using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Web.Script.Serialization;

public static class ThumbnailIpcChild
{
    public static int Main(string[] args)
    {
        try
        {
            if (args.Length != 1) return 2;
            var memory = new MemoryStream();
            using (var input = Console.OpenStandardInput())
            {
                var buffer = new byte[1024];
                int count;
                while ((count = input.Read(buffer, 0, buffer.Length)) != 0)
                {
                    memory.Write(buffer, 0, count);
                    if (memory.Length > 16384) return 3;
                }
            }
            var bytes = memory.ToArray();
            var text = new UTF8Encoding(false, true).GetString(bytes);
            bool bom = bytes.Length >= 3 && bytes[0] == 239 && bytes[1] == 187 && bytes[2] == 191;
            var serializer = new JavaScriptSerializer();
            if (args[0] == "--capture-input")
            {
                using (var hash = SHA256.Create())
                    return Send(serializer, new { bom = bom, byteLength = bytes.Length,
                        firstByte = bytes.Length == 0 ? -1 : bytes[0], sha256 = BitConverter.ToString(hash.ComputeHash(bytes)) });
            }
            if (args[0] != "--alhangeul-thumbnail-diagnostic-child") return 2;
            if (bom || bytes.Length == 0 || bytes[0] != 123) return 1;
            var request = serializer.Deserialize<Dictionary<string, object>>(text);
            Guid id;
            if (request.Count != 5 || !Guid.TryParse((string)request["requestId"], out id) || id == Guid.Empty
                || (int)request["schemaVersion"] != 1 || (string)request["operation"] != "suite"
                || request["fixtureId"] != null || !(bool)request["consent"]) return 1;
            return Send(serializer, new { schemaVersion = 1, requestId = id.ToString(), operation = "suite",
                result = new { kind = "suite", value = new { cleanup = true, testOnly = true, receivedBytes = bytes.Length } } });
        }
        catch { return 1; }
    }
    private static int Send(JavaScriptSerializer serializer, object value)
    {
        byte[] bytes = new UTF8Encoding(false, true).GetBytes(serializer.Serialize(value));
        using (var output = Console.OpenStandardOutput()) { output.Write(bytes, 0, bytes.Length); output.Flush(); }
        return 0;
    }
}
