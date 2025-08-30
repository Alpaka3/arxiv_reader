import { SSMClient, GetParameterCommand, PutParameterCommand } from '@aws-sdk/client-ssm';

export class ParameterStoreManager {
  private ssmClient: SSMClient;
  private readonly parameterName = '/ts-app/last_arxiv_number';

  constructor() {
    this.ssmClient = new SSMClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });
  }

  /**
   * Parameter Storeから最後の論文番号を取得
   */
  async getLastArxivNumber(): Promise<string> {
    try {
      const command = new GetParameterCommand({
        Name: this.parameterName,
        WithDecryption: true
      });

      const response = await this.ssmClient.send(command);
      const value = response.Parameter?.Value;
      
      if (!value) {
        console.log('Parameter not found, returning default value');
        // デフォルト値として現在の年月の最初の番号を返す
        const now = new Date();
        const yearMonth = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        return `${yearMonth}.00001`;
      }

      console.log(`Retrieved last ArXiv number from Parameter Store: ${value}`);
      return value;
    } catch (error) {
      console.warn('Failed to get parameter from Parameter Store:', error);
      // エラーの場合もデフォルト値を返す
      const now = new Date();
      const yearMonth = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      return `${yearMonth}.00001`;
    }
  }

  /**
   * Parameter Storeに最後の論文番号を保存
   */
  async setLastArxivNumber(arxivNumber: string): Promise<void> {
    try {
      const command = new PutParameterCommand({
        Name: this.parameterName,
        Value: arxivNumber,
        Type: 'String',
        Overwrite: true
      });

      await this.ssmClient.send(command);
      console.log(`Saved last ArXiv number to Parameter Store: ${arxivNumber}`);
    } catch (error) {
      console.error('Failed to save parameter to Parameter Store:', error);
      throw error;
    }
  }

  /**
   * 論文番号を比較（新しい方が大きい）
   */
  compareArxivNumbers(arxivId1: string, arxivId2: string): number {
    // ArXiv IDから番号部分を抽出 (例: "2508.20310" -> ["2508", "20310"])
    const parseArxivId = (id: string) => {
      const match = id.match(/^(\d{4})\.(\d{4,5})$/);
      if (!match) throw new Error(`Invalid ArXiv ID format: ${id}`);
      return {
        yearMonth: parseInt(match[1]),
        number: parseInt(match[2])
      };
    };

    const parsed1 = parseArxivId(arxivId1);
    const parsed2 = parseArxivId(arxivId2);

    // 年月を比較
    if (parsed1.yearMonth !== parsed2.yearMonth) {
      return parsed1.yearMonth - parsed2.yearMonth;
    }

    // 同じ年月の場合は番号を比較
    return parsed1.number - parsed2.number;
  }

  /**
   * 指定された論文番号が最後の番号より新しいかチェック
   */
  isNewerThanLast(arxivId: string, lastArxivNumber: string): boolean {
    return this.compareArxivNumbers(arxivId, lastArxivNumber) > 0;
  }
}