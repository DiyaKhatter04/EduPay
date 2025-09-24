// EduConnect Database Seeder
// Seeds the database with demo users and data for testing

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Request = require('../models/Request');
const Donation = require('../models/Donation');
const Payment = require('../models/Payment');

// Connect to MongoDB
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB for seeding');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
}

// Demo data
const demoUsers = [
    // Admin user
    {
        username: 'admin',
        email: 'admin@educonnect.com',
        password: 'admin123',
        role: 'admin',
        isActive: true
    },
    
    // Student users
    {
        username: 'student1',
        email: 'sarah.johnson@student.edu',
        password: 'student123',
        role: 'student',
        studentInfo: {
            fullName: 'Sarah Johnson',
            school: 'Springfield High School',
            grade: 'Grade 11',
            requirements: []
        },
        isActive: true
    },
    {
        username: 'student2',
        email: 'mike.chen@university.edu',
        password: 'student123',
        role: 'student',
        studentInfo: {
            fullName: 'Mike Chen',
            school: 'State University',
            grade: 'Year 2',
            requirements: []
        },
        isActive: true
    },
    {
        username: 'student3',
        email: 'emma.davis@college.edu',
        password: 'student123',
        role: 'student',
        studentInfo: {
            fullName: 'Emma Davis',
            school: 'Community College',
            grade: 'Year 1',
            requirements: []
        },
        isActive: true
    },
    
    // Donor users
    {
        username: 'donor1',
        email: 'john.smith@email.com',
        password: 'donor123',
        role: 'donor',
        donorInfo: {
            fullName: 'John Smith',
            totalDonations: 0,
            isRegularDonor: false
        },
        isActive: true
    },
    {
        username: 'donor2',
        email: 'mary.wilson@company.com',
        password: 'donor123',
        role: 'donor',
        donorInfo: {
            fullName: 'Mary Wilson',
            totalDonations: 0,
            isRegularDonor: false
        },
        isActive: true
    },
    {
        username: 'donor3',
        email: 'robert.brown@foundation.org',
        password: 'donor123',
        role: 'donor',
        donorInfo: {
            fullName: 'Robert Brown',
            totalDonations: 0,
            isRegularDonor: true
        },
        isActive: true
    }
];

// Demo requests data
const demoRequests = [
    {
        type: 'laptop',
        description: 'Need a laptop for computer science coursework and programming assignments',
        urgencyLevel: 'high',
        amount: 800,
        status: 'pending'
    },
    {
        type: 'books',
        description: 'Required textbooks for Advanced Mathematics and Physics courses',
        urgencyLevel: 'medium',
        amount: 250,
        status: 'pending'
    },
    {
        type: 'fees',
        description: 'Tuition assistance for spring semester - partial payment needed',
        urgencyLevel: 'critical',
        amount: 1500,
        status: 'pending'
    },
    {
        type: 'bag',
        description: 'Durable backpack for carrying books and supplies to school',
        urgencyLevel: 'low',
        amount: 60,
        status: 'pending'
    },
    {
        type: 'notes',
        description: 'Study materials and notes for upcoming final examinations',
        urgencyLevel: 'medium',
        amount: 40,
        status: 'fulfilled'
    }
];

// Demo donations data
const demoDonations = [
    {
        type: 'laptop',
        description: 'Dell Inspiron 15 - Good condition, perfect for students',
        value: 600,
        quantity: 1,
        status: 'available',
        images: []
    },
    {
        type: 'books',
        description: 'Collection of Mathematics and Science textbooks',
        value: 200,
        quantity: 5,
        status: 'available',
        images: []
    },
    {
        type: 'bag',
        description: 'Brand new JanSport backpack - multiple colors available',
        value: 80,
        quantity: 3,
        status: 'available',
        images: []
    },
    {
        type: 'fees',
        description: 'Scholarship fund contribution for deserving students',
        value: 1000,
        quantity: 1,
        status: 'available',
        images: []
    }
];

// Demo payments data
const demoPayments = [
    {
        amount: 500,
        type: 'tuition',
        description: 'Monthly scholarship contribution',
        status: 'pending',
        distributionMethod: 'full'
    },
    {
        amount: 300,
        type: 'supplies',
        description: 'Educational supplies fund',
        status: 'approved',
        distributionMethod: 'split'
    }
];

// Seeding functions
async function seedUsers() {
    console.log('🌱 Seeding users...');
    
    try {
        // Clear existing users (except keep any existing admin)
        await User.deleteMany({ role: { $ne: 'admin' } });
        
        const users = [];
        
        for (const userData of demoUsers) {
            // Check if admin already exists
            if (userData.role === 'admin') {
                const existingAdmin = await User.findOne({ username: userData.username, role: 'admin' });
                if (existingAdmin) {
                    console.log('ℹ️  Admin user already exists, skipping...');
                    users.push(existingAdmin);
                    continue;
                }
            }
            
            // Hash password
            const salt = await bcrypt.genSalt(12);
            const hashedPassword = await bcrypt.hash(userData.password, salt);
            
            // Create user
            const user = new User({
                ...userData,
                password: hashedPassword
            });
            
            await user.save();
            users.push(user);
            
            console.log(`✅ Created ${userData.role}: ${userData.username} (ID: ${user.uniqueId || 'N/A'})`);
        }
        
        console.log(`✅ Seeded ${users.length} users`);
        return users;
        
    } catch (error) {
        console.error('❌ Error seeding users:', error.message);
        throw error;
    }
}

async function seedRequests(users) {
    console.log('🌱 Seeding student requests...');
    
    try {
        // Clear existing requests
        await Request.deleteMany({});
        
        const students = users.filter(user => user.role === 'student');
        const requests = [];
        
        for (let i = 0; i < demoRequests.length; i++) {
            const requestData = demoRequests[i];
            const student = students[i % students.length]; // Distribute among students
            
            const request = new Request({
                ...requestData,
                student: student._id,
                priority: Date.now() + i // For first-come-first-serve ordering
            });
            
            await request.save();
            requests.push(request);
            
            console.log(`✅ Created request: ${requestData.type} for ${student.username}`);
        }
        
        console.log(`✅ Seeded ${requests.length} requests`);
        return requests;
        
    } catch (error) {
        console.error('❌ Error seeding requests:', error.message);
        throw error;
    }
}

async function seedDonations(users) {
    console.log('🌱 Seeding donor offerings...');
    
    try {
        // Clear existing donations
        await Donation.deleteMany({});
        
        const donors = users.filter(user => user.role === 'donor');
        const donations = [];
        
        for (let i = 0; i < demoDonations.length; i++) {
            const donationData = demoDonations[i];
            const donor = donors[i % donors.length]; // Distribute among donors
            
            const donation = new Donation({
                ...donationData,
                donor: donor._id,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
            });
            
            await donation.save();
            donations.push(donation);
            
            // Update donor's total donations
            donor.donorInfo.totalDonations += 1;
            await donor.save();
            
            console.log(`✅ Created donation: ${donationData.type} by ${donor.username}`);
        }
        
        console.log(`✅ Seeded ${donations.length} donations`);
        return donations;
        
    } catch (error) {
        console.error('❌ Error seeding donations:', error.message);
        throw error;
    }
}

async function seedPayments(users) {
    console.log('🌱 Seeding payments...');
    
    try {
        // Clear existing payments
        await Payment.deleteMany({});
        
        const donors = users.filter(user => user.role === 'donor');
        const students = users.filter(user => user.role === 'student');
        const payments = [];
        
        for (let i = 0; i < demoPayments.length; i++) {
            const paymentData = demoPayments[i];
            const donor = donors[i % donors.length];
            
            const payment = new Payment({
                ...paymentData,
                donor: donor._id,
                recipient: paymentData.distributionMethod === 'full' ? students[0]._id : null
            });
            
            // Add split recipients if needed
            if (paymentData.distributionMethod === 'split') {
                payment.splitAmong = students.slice(0, 2).map(student => ({
                    student: student._id,
                    amount: paymentData.amount / 2
                }));
            }
            
            await payment.save();
            payments.push(payment);
            
            console.log(`✅ Created payment: $${paymentData.amount} by ${donor.username}`);
        }
        
        console.log(`✅ Seeded ${payments.length} payments`);
        return payments;
        
    } catch (error) {
        console.error('❌ Error seeding payments:', error.message);
        throw error;
    }
}

// Create some fulfilled requests for demo
async function createFulfilledRequests(users, requests, donations) {
    console.log('🌱 Creating fulfilled request examples...');
    
    try {
        const donors = users.filter(user => user.role === 'donor');
        
        // Fulfill the notes request
        const notesRequest = requests.find(req => req.type === 'notes');
        if (notesRequest) {
            notesRequest.status = 'fulfilled';
            notesRequest.fulfilledBy = donors[0]._id;
            notesRequest.fulfilledAt = new Date();
            await notesRequest.save();
            
            console.log('✅ Fulfilled notes request');
        }
        
        // Mark one donation as donated
        const bookDonation = donations.find(don => don.type === 'books');
        if (bookDonation) {
            const students = users.filter(user => user.role === 'student');
            bookDonation.status = 'donated';
            bookDonation.recipient = students[1]._id;
            bookDonation.donatedAt = new Date();
            await bookDonation.save();
            
            console.log('✅ Marked book donation as donated');
        }
        
    } catch (error) {
        console.error('❌ Error creating fulfilled requests:', error.message);
        throw error;
    }
}

// Main seeding function
async function seedDatabase() {
    console.log('🚀 Starting database seeding...');
    console.log('📊 This will create demo data for testing EduConnect platform');
    
    try {
        await connectDB();
        
        // Seed in order (users first, then dependent data)
        const users = await seedUsers();
        const requests = await seedRequests(users);
        const donations = await seedDonations(users);
        const payments = await seedPayments(users);
        
        // Create some fulfilled examples
        await createFulfilledRequests(users, requests, donations);
        
        console.log('\n🎉 Database seeding completed successfully!');
        console.log('\n📋 Demo Accounts Created:');
        console.log('┌─────────────────────────────────────────────────────────┐');
        console.log('│                    DEMO ACCOUNTS                        │');
        console.log('├─────────────────────────────────────────────────────────┤');
        console.log('│ ADMIN:                                                  │');
        console.log('│   Username: admin                                       │');
        console.log('│   Password: admin123                                    │');
        console.log('│                                                         │');
        console.log('│ STUDENTS:                                               │');
        console.log('│   Username: student1  Password: student123             │');
        console.log('│   Username: student2  Password: student123             │');
        console.log('│   Username: student3  Password: student123             │');
        console.log('│                                                         │');
        console.log('│ DONORS:                                                 │');
        console.log('│   Username: donor1    Password: donor123               │');
        console.log('│   Username: donor2    Password: donor123               │');
        console.log('│   Username: donor3    Password: donor123               │');
        console.log('└─────────────────────────────────────────────────────────┘');
        
        console.log('\n🔍 Verification Commands:');
        console.log('To verify the seeded data in MongoDB:');
        console.log('1. Open MongoDB Compass or MongoDB shell');
        console.log('2. Connect to:', process.env.MONGODB_URI);
        console.log('3. Run these queries:');
        console.log('   - db.users.find({}) // View all users');
        console.log('   - db.requests.find({}) // View all requests');
        console.log('   - db.donations.find({}) // View all donations');
        console.log('   - db.payments.find({}) // View all payments');
        
        console.log('\n🌐 Next Steps:');
        console.log('1. Start the server: npm run dev');
        console.log('2. Visit: http://localhost:3000');
        console.log('3. Use demo accounts to test the platform');
        console.log('4. Check real-time features by opening multiple browser tabs');
        
        // Show some statistics
        const stats = {
            totalUsers: users.length,
            students: users.filter(u => u.role === 'student').length,
            donors: users.filter(u => u.role === 'donor').length,
            admins: users.filter(u => u.role === 'admin').length,
            totalRequests: requests.length,
            pendingRequests: requests.filter(r => r.status === 'pending').length,
            totalDonations: donations.length,
            availableDonations: donations.filter(d => d.status === 'available').length,
            totalPayments: payments.length
        };
        
        console.log('\n📊 Seeded Data Summary:');
        console.log(`   Users: ${stats.totalUsers} (${stats.students} students, ${stats.donors} donors, ${stats.admins} admin)`);
        console.log(`   Requests: ${stats.totalRequests} (${stats.pendingRequests} pending)`);
        console.log(`   Donations: ${stats.totalDonations} (${stats.availableDonations} available)`);
        console.log(`   Payments: ${stats.totalPayments}`);
        
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
        process.exit(0);
    }
}

// Run seeding if called directly
if (require.main === module) {
    seedDatabase();
}

module.exports = seedDatabase;