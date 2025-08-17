const { PaperEvaluator } = require('./src/lib/paperEvaluator');
const dotenv = require('dotenv');

// 環境変数を読み込み
dotenv.config();

/**
 * evaluatePapersByDateの結果をWordPressの投稿コンテンツに変換
 */
function formatContentForWordPress(results) {
  if (!results || results.length === 0) {
    return '<p>評価結果がありません。</p>';
  }

  let content = '<div class="paper-evaluation-results">\n';
  
  results.forEach((result, index) => {
    const { paper, evaluation, formattedOutput } = result;
    
    content += `
  <div class="paper-result" style="margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
    <h3>${index + 1}. ${paper.title}</h3>
    
    <div class="paper-info" style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <p><strong>arXiv ID:</strong> <a href="https://arxiv.org/abs/${paper.arxivId}" target="_blank">${paper.arxivId}</a></p>
      <p><strong>著者:</strong> ${paper.authors.join(', ')}</p>
      <p><strong>カテゴリ:</strong> ${paper.subjects.join(', ')}</p>
      <p><strong>評価スコア:</strong> <span style="background-color: #3b82f6; color: white; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${formattedOutput.point}点</span></p>
    </div>
    
    <div class="evaluation-details">
      <h4>📊 評価理由</h4>
      <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 10px 0;">
        <p>${formattedOutput.reasoning}</p>
      </div>
      
      <h4>🔢 計算過程</h4>
      <div style="background-color: #fefce8; padding: 15px; border-radius: 5px; margin: 10px 0;">
        <p>${formattedOutput.calculation}</p>
      </div>
    </div>
  </div>
`;
  });
  
  content += '</div>';
  return content;
}

/**
 * WordPress REST APIに投稿
 */
async function postToWordPress(title, content, status = 'draft') {
  const wpEndpoint = process.env.WORDPRESS_ENDPOINT;
  const username = process.env.WORDPRESS_USERNAME;
  const appPassword = process.env.WORDPRESS_APP_PASSWORD;
  
  if (!wpEndpoint || !username || !appPassword) {
    throw new Error('WordPress credentials not found in environment variables');
  }

  // Basic認証のヘッダーを作成
  const credentials = Buffer.from(`${username}:${appPassword}`).toString('base64');
  
  const postData = {
    title: title,
    content: content,
    status: status
  };

  try {
    const response = await fetch(`${wpEndpoint}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`WordPress API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }

    const result = await response.json();
    return {
      success: true,
      postId: result.id,
      postUrl: result.link,
      editUrl: `${wpEndpoint.replace('/wp-json/wp/v2', '')}/wp-admin/post.php?post=${result.id}&action=edit`
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * メイン処理
 */
async function main() {
  try {
    // 日付を指定（今日の日付を使用、またはコマンドライン引数から取得）
    const date = process.argv[2] || new Date().toISOString().split('T')[0];
    console.log(`📅 評価対象日: ${date}`);
    
    // 論文評価を実行
    console.log('🔍 論文を評価中...');
    const evaluator = new PaperEvaluator();
    const results = await evaluator.evaluatePapersByDate(date, true);
    
    if (!results || results.length === 0) {
      console.log('❌ 評価結果が見つかりませんでした。');
      return;
    }
    
    console.log(`✅ ${results.length}件の論文を評価しました`);
    
    // WordPressコンテンツを生成
    const content = formatContentForWordPress(results);
    const title = `論文評価結果 - ${date}`;
    
    // WordPress投稿を作成
    console.log('📝 WordPressに投稿中...');
    const postResult = await postToWordPress(title, content, 'draft');
    
    if (postResult.success) {
      console.log('✅ 投稿が正常に作成されました！');
      console.log(`📄 投稿ID: ${postResult.postId}`);
      console.log(`🔗 投稿URL: ${postResult.postUrl}`);
      console.log(`✏️  編集URL: ${postResult.editUrl}`);
    } else {
      console.error('❌ 投稿の作成に失敗しました:', postResult.error);
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合にmain関数を呼び出し
if (require.main === module) {
  main();
}

module.exports = { formatContentForWordPress, postToWordPress };