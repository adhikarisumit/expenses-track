# Financial Management App

A comprehensive financial management application built with HTML, CSS, and JavaScript that helps users track income, expenses, budgets, and financial analytics. Deployed on Vercel for optimal performance and scalability.

## Features

- **Dashboard**: Overview of financial metrics, recent transactions, and quick insights
- **Income Management**: Track multiple income sources with monthly income tracking
- **Expense Tracking**: Categorize and track all expenses with detailed analytics
- **Budget Management**: Set category-based budgets with spent tracking and savings calculation
- **Financial Reports**: Comprehensive reports including:
  - Monthly financial data
  - Budget vs. actual analysis
  - Category breakdown charts
  - Income vs. expense trends
  - Savings trends and projections
- **Data Export**: Export monthly data as Excel-compatible CSV files
- **Responsive Design**: Mobile-friendly interface using Bootstrap
- **Dark/Light Theme**: Toggle between themes for better user experience
- **Real-time Updates**: Automatic data synchronization across all sections

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Bootstrap 5
- **Charts**: Chart.js
- **Icons**: Font Awesome
- **Backend**: Node.js with Express
- **Database**: SQLite
- **Deployment**: Vercel (Serverless)
- **Authentication**: JWT-based

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Local Development
1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd financial-management-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your configuration:
   ```env
   JWT_SECRET=your-secret-key
   NODE_ENV=development
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Deployment

### Vercel Deployment (Recommended)
1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy to Vercel:
   ```bash
   npm run deploy
   ```

3. Set environment variables in Vercel dashboard:
   - `JWT_SECRET` - Your secret key for JWT tokens
   - `NODE_ENV` - Set to `production`
   - `VERCEL` - Set to `1`

For detailed deployment instructions, see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

## Project Structure

```
financial-management-app/
├── index.html              # Main HTML file
├── style.css               # Styles and theme variables
├── script.js               # Main JavaScript application
├── server.js               # Express server (for API endpoints)
├── package.json            # Node.js dependencies
├── vercel.json             # Vercel deployment configuration
├── README.md               # Project documentation
├── VERCEL_DEPLOYMENT.md    # Detailed deployment guide
├── api/                    # API endpoints
│   ├── auth.js             # Authentication endpoints
│   ├── transactions.js     # Transaction management
│   └── reports.js          # Report generation
└── database/               # Database configuration
    ├── connection.js       # Database connection
    ├── init.js             # Database initialization
    └── schema.sql          # Database schema
```

## API Endpoints

The app includes serverless API endpoints for database operations:

- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `GET /api/transactions` - Fetch user transactions
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/reports/monthly` - Get monthly financial data
- `GET /api/health` - Health check endpoint

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the GitHub repository.
