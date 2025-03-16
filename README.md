# Link Up

A social platform that helps people connect with others who share similar interests at their favorite places.

## Features

- User authentication and profile management
- Location-based event creation and discovery
- Real-time notifications for link-up requests
- User ratings and reviews
- Interest-based matching
- Contact information sharing after acceptance

## Tech Stack

- Next.js 13+ with App Router
- TypeScript
- Firebase (Authentication, Firestore)
- Tailwind CSS
- React Icons
- Framer Motion

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/your-username/link-up.git
cd link-up
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory with your Firebase configuration:
```
NEXT_PUBLIC_FIREBASE_CONFIG={"apiKey":"your-api-key","authDomain":"your-auth-domain","projectId":"your-project-id","storageBucket":"your-storage-bucket","messagingSenderId":"your-messaging-sender-id","appId":"your-app-id"}
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment to AWS Elastic Beanstalk

1. Install the AWS Elastic Beanstalk CLI:
```bash
pip install awsebcli
```

2. Initialize your EB environment:
```bash
eb init
```

3. Create an environment and deploy:
```bash
eb create
```

4. For subsequent deployments:
```bash
eb deploy
```

## Environment Variables

Make sure to set these environment variables in your Elastic Beanstalk environment:

- `NEXT_PUBLIC_FIREBASE_CONFIG`: Your Firebase configuration JSON

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 