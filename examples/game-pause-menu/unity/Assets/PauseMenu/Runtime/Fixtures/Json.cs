using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace GamePauseMenu
{
    /// <summary>Raised when a fixture copy on disk cannot be read as the lane data contract.
    /// This is an authoring error, so the lane fails loudly at parse time instead of
    /// rendering a partially empty pause menu.</summary>
    public sealed class JsonParseException : Exception
    {
        public JsonParseException(string message) : base(message) { }
    }

    public abstract class JsonValue
    {
        public abstract string TypeName { get; }
    }

    public sealed class JsonNull : JsonValue
    {
        public static readonly JsonNull Instance = new JsonNull();
        private JsonNull() { }
        public override string TypeName => "null";
    }

    public sealed class JsonBool : JsonValue
    {
        public bool Value;
        public override string TypeName => "boolean";
    }

    public sealed class JsonNumber : JsonValue
    {
        public double Value;
        public override string TypeName => "number";
    }

    public sealed class JsonString : JsonValue
    {
        public string Value;
        public override string TypeName => "string";
    }

    public sealed class JsonArray : JsonValue
    {
        public readonly List<JsonValue> Items = new List<JsonValue>();
        public override string TypeName => "array";
    }

    public sealed class JsonObject : JsonValue
    {
        public readonly List<KeyValuePair<string, JsonValue>> Members = new List<KeyValuePair<string, JsonValue>>();
        public override string TypeName => "object";

        public bool TryGet(string name, out JsonValue value)
        {
            for (var i = 0; i < Members.Count; i++)
            {
                if (Members[i].Key == name) { value = Members[i].Value; return true; }
            }
            value = null;
            return false;
        }
    }

    /// <summary>Minimal recursive-descent JSON reader. The lane owns this adapter so fixture
    /// shape and failure messages stay lane-local: no engine serializer assumptions, no
    /// dictionary-of-stats limitations, and a syntax error names its byte offset.</summary>
    public static class Json
    {
        public static JsonValue Parse(string text)
        {
            if (text == null) throw new JsonParseException("Fixture text is null.");
            var reader = new Reader(text);
            var value = reader.ReadValue();
            reader.SkipWhitespace();
            if (!reader.AtEnd) throw reader.Error("unexpected trailing content after the root value");
            return value;
        }

        private sealed class Reader
        {
            private readonly string text;
            private int index;

            public Reader(string text) { this.text = text; }

            public bool AtEnd => index >= text.Length;
            public JsonParseException Error(string problem) =>
                new JsonParseException($"Invalid fixture JSON at offset {index}: {problem}.");

            public void SkipWhitespace()
            {
                while (index < text.Length)
                {
                    var c = text[index];
                    if (c == ' ' || c == '\t' || c == '\n' || c == '\r') index++;
                    else break;
                }
            }

            private char Peek() => index < text.Length ? text[index] : '\0';

            private void Expect(char c, string context)
            {
                SkipWhitespace();
                if (Peek() != c) throw Error($"expected '{c}' {context} but found {(AtEnd ? "end of input" : "'" + Peek() + "'")}");
                index++;
            }

            public JsonValue ReadValue()
            {
                SkipWhitespace();
                if (AtEnd) throw Error("expected a value but the document ended");
                var c = Peek();
                switch (c)
                {
                    case '{': return ReadObject();
                    case '[': return ReadArray();
                    case '"': return new JsonString { Value = ReadString() };
                    case 't': ReadLiteral("true"); return new JsonBool { Value = true };
                    case 'f': ReadLiteral("false"); return new JsonBool { Value = false };
                    case 'n': ReadLiteral("null"); return JsonNull.Instance;
                    default:
                        if (c == '-' || (c >= '0' && c <= '9')) return ReadNumber();
                        throw Error($"unexpected character '{c}' where a value was expected");
                }
            }

            private void ReadLiteral(string literal)
            {
                if (string.CompareOrdinal(text, index, literal, 0, literal.Length) != 0)
                    throw Error($"expected literal '{literal}'");
                index += literal.Length;
            }

            private JsonObject ReadObject()
            {
                var obj = new JsonObject();
                Expect('{', "to open an object");
                SkipWhitespace();
                if (Peek() == '}') { index++; return obj; }
                while (true)
                {
                    SkipWhitespace();
                    if (Peek() != '"') throw Error("expected a quoted object key");
                    var key = ReadString();
                    for (var i = 0; i < obj.Members.Count; i++)
                        if (obj.Members[i].Key == key) throw Error($"duplicate object key '{key}'");
                    Expect(':', $"after object key '{key}'");
                    obj.Members.Add(new KeyValuePair<string, JsonValue>(key, ReadValue()));
                    SkipWhitespace();
                    if (Peek() == ',') { index++; continue; }
                    if (Peek() == '}') { index++; return obj; }
                    throw Error("expected ',' or '}' in object");
                }
            }

            private JsonArray ReadArray()
            {
                var array = new JsonArray();
                Expect('[', "to open an array");
                SkipWhitespace();
                if (Peek() == ']') { index++; return array; }
                while (true)
                {
                    array.Items.Add(ReadValue());
                    SkipWhitespace();
                    if (Peek() == ',') { index++; continue; }
                    if (Peek() == ']') { index++; return array; }
                    throw Error("expected ',' or ']' in array");
                }
            }

            private string ReadString()
            {
                var builder = new StringBuilder();
                index++; // opening quote
                while (true)
                {
                    if (AtEnd) throw Error("unterminated string");
                    var c = text[index++];
                    if (c == '"') return builder.ToString();
                    if (c != '\\') { builder.Append(c); continue; }
                    if (AtEnd) throw Error("unterminated escape sequence");
                    var escaped = text[index++];
                    switch (escaped)
                    {
                        case '"': builder.Append('"'); break;
                        case '\\': builder.Append('\\'); break;
                        case '/': builder.Append('/'); break;
                        case 'b': builder.Append('\b'); break;
                        case 'f': builder.Append('\f'); break;
                        case 'n': builder.Append('\n'); break;
                        case 'r': builder.Append('\r'); break;
                        case 't': builder.Append('\t'); break;
                        case 'u':
                            if (index + 4 > text.Length) throw Error("truncated unicode escape");
                            var hex = text.Substring(index, 4);
                            if (!int.TryParse(hex, NumberStyles.HexNumber, CultureInfo.InvariantCulture, out var code))
                                throw Error($"invalid unicode escape '\\u{hex}'");
                            builder.Append((char)code);
                            index += 4;
                            break;
                        default: throw Error($"invalid escape '\\{escaped}'");
                    }
                }
            }

            private JsonNumber ReadNumber()
            {
                var start = index;
                if (Peek() == '-') index++;
                while (!AtEnd && char.IsDigit(Peek())) index++;
                if (!AtEnd && Peek() == '.')
                {
                    index++;
                    if (AtEnd || !char.IsDigit(Peek())) throw Error("expected a digit after the decimal point");
                    while (!AtEnd && char.IsDigit(Peek())) index++;
                }
                if (!AtEnd && (Peek() == 'e' || Peek() == 'E'))
                {
                    index++;
                    if (!AtEnd && (Peek() == '+' || Peek() == '-')) index++;
                    if (AtEnd || !char.IsDigit(Peek())) throw Error("expected a digit in the exponent");
                    while (!AtEnd && char.IsDigit(Peek())) index++;
                }
                var slice = text.Substring(start, index - start);
                if (!double.TryParse(slice, NumberStyles.Float, CultureInfo.InvariantCulture, out var number))
                    throw Error($"invalid number '{slice}'");
                return new JsonNumber { Value = number };
            }
        }
    }
}
