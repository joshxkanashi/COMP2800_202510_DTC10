# COMP2800_202510_DTC10

## About Us
Team Name: DTC-10 <br>
Team Members:
Nathan Hong <br>
Senuk Jayalath <br>
Joshua Sopena <br>
Yi Yu Zhao <br>

## Project Pitch
Due to the rising cost of living in Vancouver, we are creating a financial tracking app that is catered towards students to help them save and keep track of their student loans.

## Description
Computer science students struggle to effectively showcase their skills and projects to potential employers. Traditional platforms like LinkedIn aren't built for technical portfolios, while personal websites offer little support or connection. As it becomes increasingly difficult for tech graduates to break into the industry, we are building an application that helps computer science students showcase their skills through intelligent, career-driven portfolios.

## Frontend
HTML, CSS, Javascript

## Backend
node.js, Supabase

## File Structure
```
├── components/     # Reusable UI components
├── css/           # Stylesheets
├── js/            # JavaScript files
├── view/          # View templates
├── images/        # Image assets
├── package.json   # Project dependencies
└── README.md      # Project documentation
```

## Installation and Setup

### Prerequisites
1. Node.js (v16 or higher)
2. npm (comes with Node.js)
3. A modern code editor (VS Code recommended)
4. Git

### Required Software and Tools
1. Node.js and npm
2. VS Code (or preferred IDE)
3. Supabase account
4. Git

### Third-Party Dependencies
- @supabase/auth-ui-react (^0.4.7)
- @supabase/auth-ui-shared (^0.1.8)
- @supabase/supabase-js (^2.49.4)

### Installation Steps
1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd COMP2800_202510_DTC10
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
   This will install all required dependencies including:
   - @supabase/auth-ui-react
   - @supabase/auth-ui-shared
   - @supabase/supabase-js

3. Set up Supabase:
   - Create a Supabase account at https://supabase.com
   - Create a new project
   - Get your project URL and anon key
   - Create a `.env` file in the root directory with:
     ```
     SUPABASE_URL=your_project_url
     SUPABASE_ANON_KEY=your_anon_key
     ```

4. Start the development server:
   ```bash
   npm start
   ```

## Features
- User authentication and authorization
- Financial tracking dashboard
- Student loan management
- Expense categorization
- Budget planning tools
- Progress visualization
- Export functionality

## Credits and References
- Supabase for backend services
- Node.js for runtime environment
- Various open-source libraries and tools

## AI and API Usage
This project utilizes the following AI and API services:

1. Supabase
   - Authentication services
   - Database management
   - Real-time data synchronization

2. GitHub Copilot
   - Code suggestions and completions
   - Documentation assistance

## Contact Information
For any questions or support, please contact:
- Nathan Hong: [email]
- Senuk Jayalath: [email]
- Joshua Sopena: [email]
- Yi Yu Zhao: [email]

## License
This project is licensed under the MIT License - see the LICENSE file for details.