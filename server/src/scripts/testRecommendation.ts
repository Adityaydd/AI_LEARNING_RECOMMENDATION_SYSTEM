import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../db/connect.js';
import { UserModel } from '../models/User.js';
import { getContentBasedRecommendations, getCollaborativeRecommendations, getHybridRecommendations } from '../services/recommendation.js';

async function testRecommendations() {
  console.log('🧪 Testing Recommendation Engine...\n');

  try {
    await connectDB();

    // Find test users
    const userWithHistory = await UserModel.findOne({ onboardingCompleted: true }).lean();
    const coldStartUser = await UserModel.findOne({ onboardingCompleted: false }).lean();

    if (!userWithHistory) {
      console.error('❌ No user with interaction history found. Run seed first.');
      return;
    }

    if (!coldStartUser) {
      console.error('❌ No cold-start user found. Run seed first.');
      return;
    }

    console.log('👤 Test User with History:', userWithHistory.name, `(${userWithHistory._id})`);
    console.log('👤 Cold-Start User:', coldStartUser.name, `(${coldStartUser._id})`);
    console.log('');

    // Test 1: Content-based recommendations for user with history
    console.log('📚 Test 1: Content-Based Recommendations (User with History)');
    const contentRecs1 = await getContentBasedRecommendations(userWithHistory._id.toString(), 5);
    console.log(`   Found ${contentRecs1.length} recommendations:`);
    contentRecs1.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec.title} (${rec.domain}) - Score: ${rec.score.toFixed(3)} - ${rec.reason}`);
    });
    console.log('');

    // Test 2: Collaborative recommendations for user with history
    console.log('👥 Test 2: Collaborative Recommendations (User with History)');
    const collabRecs1 = await getCollaborativeRecommendations(userWithHistory._id.toString(), 5);
    console.log(`   Found ${collabRecs1.length} recommendations:`);
    collabRecs1.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec.title} (${rec.domain}) - Score: ${rec.score.toFixed(3)} - ${rec.reason}`);
    });
    console.log('');

    // Test 3: Hybrid recommendations for user with history
    console.log('🔀 Test 3: Hybrid Recommendations (User with History)');
    const hybridRecs1 = await getHybridRecommendations(userWithHistory._id.toString(), 5);
    console.log(`   Found ${hybridRecs1.length} recommendations:`);
    hybridRecs1.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec.title} (${rec.domain}) - Score: ${rec.score.toFixed(3)} - ${rec.reason}`);
    });
    console.log('');

    // Test 4: Content-based for cold-start user
    console.log('❄️  Test 4: Content-Based Recommendations (Cold-Start User)');
    const contentRecs2 = await getContentBasedRecommendations(coldStartUser._id.toString(), 5);
    console.log(`   Found ${contentRecs2.length} recommendations:`);
    contentRecs2.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec.title} (${rec.domain}) - Score: ${rec.score.toFixed(3)} - ${rec.reason}`);
    });
    console.log('');

    // Test 5: Hybrid for cold-start user (should fall back to content-based)
    console.log('❄️  Test 5: Hybrid Recommendations (Cold-Start User)');
    const hybridRecs2 = await getHybridRecommendations(coldStartUser._id.toString(), 5);
    console.log(`   Found ${hybridRecs2.length} recommendations:`);
    hybridRecs2.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec.title} (${rec.domain}) - Score: ${rec.score.toFixed(3)} - ${rec.reason}`);
    });
    console.log('');

    // Test 6: Edge case - non-existent user
    console.log('🚫 Test 6: Non-existent User');
    const emptyRecs = await getHybridRecommendations(new mongoose.Types.ObjectId().toString(), 5);
    console.log(`   Recommendations for non-existent user: ${emptyRecs.length} (should be 0)`);
    console.log('');

    // Validation checks
    console.log('✅ Validation Checks:');

    // Check cold-start returns results
    const coldStartHasResults = hybridRecs2.length > 0;
    console.log(`   Cold-start fallback works: ${coldStartHasResults ? 'PASS' : 'FAIL'}`);

    // Check scores are in valid range
    const allRecs = [...hybridRecs1, ...hybridRecs2];
    const scoresValid = allRecs.every(r => r.score >= 0 && r.score <= 1);
    console.log(`   Scores in valid range [0,1]: ${scoresValid ? 'PASS' : 'FAIL'}`);

    // Check no completed courses in recommendations for user with history
    const userInteractions = await mongoose.connection.db?.collection('interactions').find({
      userId: userWithHistory._id,
      completionStatus: 'completed'
    }).toArray();

    const completedCourseIds = new Set(userInteractions?.map(i => i.courseId.toString()) || []);
    const noCompletedInRecs = !hybridRecs1.some(r => completedCourseIds.has(r.courseId.toString()));
    console.log(`   No completed courses recommended: ${noCompletedInRecs ? 'PASS' : 'FAIL'}`);

    // Check recommendation count <= limit
    const limitRespected = hybridRecs1.length <= 5 && hybridRecs2.length <= 5;
    console.log(`   Limit respected: ${limitRespected ? 'PASS' : 'FAIL'}`);

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testRecommendations().catch(console.error);
}

export { testRecommendations };