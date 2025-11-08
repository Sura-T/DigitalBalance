# 🏗️ Architecture Overview - Digital Balance

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│                     (http://localhost:3000)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP/REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Frontend (React)                      │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │  UploadTab   │ DashboardTab │  ReconTab    │   ChatTab    │  │
│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
│                       API Client (axios)                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ REST API
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Node.js + Express API Backend                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Route Handlers                         │    │
│  │  /files  /kpi  /vat  /recon  /quality  /chat  /export   │    │
│  └──────────────────────┬──────────────────────────────────┘    │
│                         │                                        │
│  ┌──────────────────────▼──────────────────────────────────┐    │
│  │                    Services Layer                        │    │
│  │  ┌──────────┬──────────────┬─────────────────────────┐  │    │
│  │  │FileService│DatabaseService│    LLM Service        │  │    │
│  │  └──────────┴──────────────┴─────────────────────────┘  │    │
│  └──────────────────────┬──────────────────────────────────┘    │
│                         │                                        │
│  ┌──────────────────────▼──────────────────────────────────┐    │
│  │                    Parsers Layer                         │    │
│  │  ┌─────────────────┬─────────────────────────────────┐  │    │
│  │  │  Excel Parser   │       PDF Parser                │  │    │
│  │  │  (PT-PT)        │   (Bank Statements)             │  │    │
│  │  └─────────────────┴─────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
└────────────────┬────────────────────────────┬───────────────────┘
                 │                            │
                 │ Prisma ORM                 │ OpenAI API
                 ▼                            ▼
┌─────────────────────────────────┐  ┌──────────────────────┐
│      PostgreSQL Database        │  │   LLM Provider       │
│  ┌──────────────────────────┐   │  │  (OpenAI/Qwen/etc)   │
│  │ Sales                    │   │  └──────────────────────┘
│  │ BankTransactions         │   │
│  │ DailyReconciliation      │   │
│  │ UploadedFiles            │   │
│  │ ChatSessions/Messages    │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

## Data Flow

### 1. File Upload Flow

```
User uploads files
      │
      ▼
Frontend (UploadTab)
      │
      ├─ FormData with files
      │
      ▼
API: POST /files/upload
      │
      ├─ Multer middleware (memory storage)
      │
      ▼
FileService.processSalesFile()
      │
      ├─ ExcelParser.parseExcel()
      │   ├─ Header normalization (PT → EN)
      │   ├─ Date parsing (DD/MM/YYYY)
      │   ├─ Number parsing (1.234,56 → 1234.56)
      │   └─ Month inference
      │
      ├─ Store raw data in UploadedFile table
      │
      └─ Store canonical data in Sale table
      │
FileService.processBankFile()
      │
      ├─ PdfParser.parseBankPDF()
      │   ├─ Extract text from PDF
      │   ├─ Parse transaction lines
      │   ├─ Classify transactions (TPA, fees, etc.)
      │   └─ Month inference
      │
      ├─ Store raw text in UploadedFile table
      │
      └─ Store transactions in BankTransaction table
      │
      ▼
FileService.computeReconciliation()
      │
      ├─ For each day:
      │   ├─ Sum card sales
      │   ├─ Sum TPA credits (same day + T+1)
      │   ├─ Sum fees
      │   ├─ Calculate delta
      │   └─ Determine pass/fail
      │
      └─ Store in DailyReconciliation table
      │
      ▼
Return metrics to frontend
```

### 2. Dashboard Data Flow

```
User selects month
      │
      ▼
Frontend (DashboardTab)
      │
      ├─ Parallel API calls:
      │
      ├─ GET /kpi/summary?month=YYYY-MM
      │   └─ Aggregate sales data
      │       └─ Return: revenue, invoices, avgTicket, paymentSplit
      │
      ├─ GET /kpi/daily?month=YYYY-MM
      │   └─ Group sales by date
      │       └─ Return: daily revenue series
      │
      ├─ GET /kpi/top-customers?month=YYYY-MM
      │   └─ Aggregate by customer
      │       └─ Return: sorted by revenue
      │
      ├─ GET /kpi/top-products?month=YYYY-MM
      │   └─ Aggregate by product
      │       └─ Return: sorted by revenue
      │
      ├─ GET /vat/report?month=YYYY-MM
      │   └─ Group by VAT rate and date
      │       └─ Return: daily + totals
      │
      └─ GET /quality/anomalies?month=YYYY-MM
          └─ Validate data integrity
              └─ Return: anomalies list
      │
      ▼
Render dashboard components
```

### 3. Chat Flow

```
User types question
      │
      ▼
Frontend (ChatTab)
      │
      ▼
POST /chat/ask
  Body: { session_id?, prompt, month? }
      │
      ▼
LLMService.answerQuestion()
      │
      ├─ Get target month (from param or latest)
      │
      ├─ LLMService.getContextForMonth()
      │   ├─ Fetch sales data
      │   ├─ Aggregate KPIs
      │   ├─ Compute summaries
      │   └─ Return compact context
      │
      ├─ Fetch chat history
      │
      ├─ Build messages array:
      │   ├─ System prompt (grounding instructions)
      │   ├─ Chat history
      │   ├─ Context data
      │   └─ User question
      │
      ├─ Call OpenAI-compatible API
      │   └─ POST to OPENAI_BASE_URL/chat/completions
      │
      ├─ Save user message to DB
      │
      └─ Save assistant response to DB
      │
      ▼
Return response to frontend
```

## Month Inference Algorithm

```python
def inferMonth(dates: Date[]) -> string:
    monthCounts = {}
    
    for date in dates:
        monthKey = f"{date.year}-{date.month:02d}"
        monthCounts[monthKey] = monthCounts.get(monthKey, 0) + 1
    
    # Return month with most occurrences
    return max(monthCounts, key=monthCounts.get)
```

**Why this works:**
- Most transactions in a file belong to the same month
- Handles edge cases (e.g., transactions from previous/next month)
- No hardcoded dates needed

## Reconciliation Algorithm

```
For each day D in sales data:
    
    1. Get card sales for day D:
       salesCard = SUM(Sale.grossAmount 
                       WHERE date = D 
                       AND paymentMethod LIKE '%Cartão%')
    
    2. Get TPA settlements for day D and D+1 (T+1 support):
       bankTPA = SUM(BankTransaction.credit 
                     WHERE date IN [D, D+1] 
                     AND isTPASettlement = true)
    
    3. Get fees for day D and D+1:
       fees = SUM(BankTransaction.debit 
                  WHERE date IN [D, D+1] 
                  AND (isFee = true OR isVATOnFee = true))
    
    4. Calculate delta:
       delta = salesCard - bankTPA - fees
       deltaPercent = (delta / salesCard) * 100
    
    5. Determine pass/fail:
       pass = abs(deltaPercent) <= 5%
    
    6. Store in DailyReconciliation table

Overall Pass = (days_passed / total_days) >= 90%
```

## Header Normalization Map

PT-PT headers are normalized to canonical English field names:

| Portuguese Variations | Canonical Field |
|----------------------|-----------------|
| data, Data, DATA | date |
| fatura, Fatura, Nº Fatura, factura | invoiceNumber |
| cliente, Cliente, CLIENTE, nome | customer |
| produto, Produto, artigo, descrição | product |
| quantidade, Qtd, qtd | quantity |
| preço, Preço Unitário, P.U. | unitPriceNet |
| taxa iva, Taxa IVA, IVA % | vatRate |
| liquido, Líquido, base, Base | netAmount |
| iva, IVA, Valor IVA | vatAmount |
| total, Total, TOTAL, Valor Total | grossAmount |
| pagamento, Forma Pagamento, método | paymentMethod |

## Database Schema

### Sales Table
```sql
- id (UUID, PK)
- month (VARCHAR) -- "YYYY-MM"
- date (TIMESTAMP)
- invoiceNumber (VARCHAR)
- customer (VARCHAR)
- product (VARCHAR)
- quantity (FLOAT)
- unitPriceNet (FLOAT)
- vatRate (FLOAT)
- netAmount (FLOAT)
- vatAmount (FLOAT)
- grossAmount (FLOAT)
- paymentMethod (VARCHAR)
- createdAt (TIMESTAMP)

Indexes: month, date, paymentMethod, customer, product
```

### BankTransaction Table
```sql
- id (UUID, PK)
- month (VARCHAR)
- date (TIMESTAMP)
- description (VARCHAR)
- debit (FLOAT, nullable)
- credit (FLOAT, nullable)
- balance (FLOAT)
- isTPASettlement (BOOLEAN)
- isFee (BOOLEAN)
- isVATOnFee (BOOLEAN)
- createdAt (TIMESTAMP)

Indexes: month, date, isTPASettlement, isFee
```

### DailyReconciliation Table
```sql
- id (UUID, PK)
- month (VARCHAR)
- date (TIMESTAMP)
- salesCard (FLOAT)
- bankTPA (FLOAT)
- fees (FLOAT)
- delta (FLOAT)
- deltaPercent (FLOAT)
- pass (BOOLEAN)
- createdAt (TIMESTAMP)

Unique: (month, date)
Indexes: month, date
```

## Technology Stack

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL 15
- **File Parsing**: 
  - XLSX (SheetJS) for Excel
  - pdf-parse for PDF
- **LLM Client**: OpenAI SDK (compatible with any OpenAI API)
- **Testing**: Jest + Supertest
- **Language**: TypeScript

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Language**: TypeScript

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Database**: PostgreSQL (containerized)
- **Reverse Proxy**: None (direct access, add nginx for production)

## Security Considerations

1. **Environment Variables**: All secrets in `.env` (gitignored)
2. **File Upload**: Limited to 50MB, validated extensions
3. **SQL Injection**: Protected by Prisma ORM
4. **CORS**: Enabled for localhost (configure for production)
5. **Rate Limiting**: Not implemented (add for production)
6. **Authentication**: Not implemented (add JWT/OAuth for production)

## Scalability Considerations

1. **Horizontal Scaling**: API is stateless, can scale horizontally
2. **Database**: Use connection pooling (Prisma handles this)
3. **File Storage**: Currently in-memory, consider S3 for production
4. **Caching**: Add Redis for KPI queries
5. **Load Balancing**: Use nginx or cloud load balancer

## Performance Optimizations

1. **Parallel API Calls**: Frontend fetches dashboard data in parallel
2. **Database Indexes**: Strategic indexes on commonly queried fields
3. **Batch Inserts**: Use Prisma's createMany where possible
4. **Lazy Loading**: Charts render only when visible
5. **LLM Context**: Send compact summaries, not raw data

## Future Enhancements

- [ ] Multi-user support with authentication
- [ ] Real-time updates with WebSockets
- [ ] Advanced analytics (trends, forecasting)
- [ ] Export to PDF/Excel
- [ ] Email notifications for reconciliation failures
- [ ] Mobile app
- [ ] Multi-currency support
- [ ] Invoice generation
- [ ] Automated bank API integration

