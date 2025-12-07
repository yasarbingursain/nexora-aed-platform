/**
 * Post-Quantum Cryptography Controller
 * MVP API endpoints for PQC operations
 */

import { Request, Response } from 'express';
import { pqcService } from '@/services/pqc/pqc.service';
import { logger } from '@/utils/logger';

export class PQCController {
  /**
   * GET /api/v1/pqc/capabilities
   * Get PQC service capabilities and supported algorithms
   */
  async getCapabilities(req: Request, res: Response): Promise<void> {
    try {
      const capabilities = await pqcService.getCapabilities();
      res.json({
        success: true,
        data: capabilities,
      });
    } catch (error) {
      logger.error('Failed to get PQC capabilities', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve PQC capabilities',
      });
    }
  }

  /**
   * POST /api/v1/pqc/self-test
   * Run PQC algorithm self-tests
   */
  async runSelfTest(req: Request, res: Response): Promise<void> {
    try {
      const results = await pqcService.selfTest();
      res.json({
        success: results.success,
        data: results,
        message: results.success 
          ? 'All PQC algorithms passed self-test' 
          : 'Some PQC algorithms failed self-test',
      });
    } catch (error) {
      logger.error('PQC self-test failed', { error });
      res.status(500).json({
        success: false,
        error: 'PQC self-test failed',
      });
    }
  }

  /**
   * POST /api/v1/pqc/keys/kem
   * Generate ML-KEM key pair (Kyber)
   */
  async generateKEMKey(req: Request, res: Response): Promise<void> {
    try {
      const { algorithm = 'ML-KEM-768' } = req.body;
      const organizationId = (req as any).organizationId;

      if (!['ML-KEM-768', 'ML-KEM-1024'].includes(algorithm)) {
        res.status(400).json({
          success: false,
          error: 'Invalid algorithm. Use ML-KEM-768 or ML-KEM-1024',
        });
        return;
      }

      const keyPair = await pqcService.generateKEMKeyPair(algorithm);
      
      // Store key pair
      const identityId = await pqcService.storeKeyPair(organizationId, keyPair, 'encryption');

      res.status(201).json({
        success: true,
        data: {
          keyId: keyPair.keyId,
          identityId,
          algorithm: keyPair.algorithm,
          fingerprint: keyPair.fingerprint,
          publicKey: Buffer.from(keyPair.publicKey).toString('base64'),
          createdAt: keyPair.createdAt,
          expiresAt: keyPair.expiresAt,
          nistStandard: 'FIPS 203',
        },
        message: 'ML-KEM key pair generated successfully',
      });
    } catch (error) {
      logger.error('Failed to generate KEM key', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to generate KEM key pair',
      });
    }
  }

  /**
   * POST /api/v1/pqc/keys/dsa
   * Generate ML-DSA key pair (Dilithium)
   */
  async generateDSAKey(req: Request, res: Response): Promise<void> {
    try {
      const { algorithm = 'ML-DSA-65' } = req.body;
      const organizationId = (req as any).organizationId;

      if (!['ML-DSA-65', 'ML-DSA-87'].includes(algorithm)) {
        res.status(400).json({
          success: false,
          error: 'Invalid algorithm. Use ML-DSA-65 or ML-DSA-87',
        });
        return;
      }

      const keyPair = await pqcService.generateDSAKeyPair(algorithm);
      
      // Store key pair
      const identityId = await pqcService.storeKeyPair(organizationId, keyPair, 'signing');

      res.status(201).json({
        success: true,
        data: {
          keyId: keyPair.keyId,
          identityId,
          algorithm: keyPair.algorithm,
          fingerprint: keyPair.fingerprint,
          publicKey: Buffer.from(keyPair.publicKey).toString('base64'),
          createdAt: keyPair.createdAt,
          expiresAt: keyPair.expiresAt,
          nistStandard: 'FIPS 204',
        },
        message: 'ML-DSA key pair generated successfully',
      });
    } catch (error) {
      logger.error('Failed to generate DSA key', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to generate DSA key pair',
      });
    }
  }

  /**
   * POST /api/v1/pqc/keys/slh-dsa
   * Generate SLH-DSA key pair (SPHINCS+)
   */
  async generateSLHDSAKey(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = (req as any).organizationId;

      const keyPair = await pqcService.generateSLHDSAKeyPair();
      
      // Store key pair
      const identityId = await pqcService.storeKeyPair(organizationId, keyPair, 'signing');

      res.status(201).json({
        success: true,
        data: {
          keyId: keyPair.keyId,
          identityId,
          algorithm: keyPair.algorithm,
          fingerprint: keyPair.fingerprint,
          publicKey: Buffer.from(keyPair.publicKey).toString('base64'),
          createdAt: keyPair.createdAt,
          expiresAt: keyPair.expiresAt,
          nistStandard: 'FIPS 205',
        },
        message: 'SLH-DSA key pair generated successfully',
      });
    } catch (error) {
      logger.error('Failed to generate SLH-DSA key', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to generate SLH-DSA key pair',
      });
    }
  }

  /**
   * POST /api/v1/pqc/encapsulate
   * Encapsulate shared secret using ML-KEM
   */
  async encapsulate(req: Request, res: Response): Promise<void> {
    try {
      const { publicKey, algorithm = 'ML-KEM-768' } = req.body;

      if (!publicKey) {
        res.status(400).json({
          success: false,
          error: 'publicKey is required (base64 encoded)',
        });
        return;
      }

      const publicKeyBytes = Buffer.from(publicKey, 'base64');
      const result = await pqcService.encapsulate(publicKeyBytes, algorithm);

      res.json({
        success: true,
        data: {
          ciphertext: Buffer.from(result.ciphertext).toString('base64'),
          sharedSecret: Buffer.from(result.sharedSecret).toString('base64'),
          algorithm,
        },
        message: 'Key encapsulation successful',
      });
    } catch (error) {
      logger.error('Encapsulation failed', { error });
      res.status(500).json({
        success: false,
        error: 'Encapsulation failed',
      });
    }
  }

  /**
   * POST /api/v1/pqc/sign
   * Sign message using ML-DSA or SLH-DSA
   */
  async sign(req: Request, res: Response): Promise<void> {
    try {
      const { message, secretKey, algorithm = 'ML-DSA-65' } = req.body;

      if (!message || !secretKey) {
        res.status(400).json({
          success: false,
          error: 'message and secretKey are required',
        });
        return;
      }

      const messageBytes = Buffer.from(message, 'base64');
      const secretKeyBytes = Buffer.from(secretKey, 'base64');

      let signature: Uint8Array;

      if (algorithm === 'SLH-DSA-SHA2-256f') {
        signature = await pqcService.signWithSLHDSA(messageBytes, secretKeyBytes);
      } else {
        signature = await pqcService.signWithDSA(messageBytes, secretKeyBytes, algorithm);
      }

      res.json({
        success: true,
        data: {
          signature: Buffer.from(signature).toString('base64'),
          algorithm,
        },
        message: 'Message signed successfully',
      });
    } catch (error) {
      logger.error('Signing failed', { error });
      res.status(500).json({
        success: false,
        error: 'Signing failed',
      });
    }
  }

  /**
   * POST /api/v1/pqc/verify
   * Verify signature using ML-DSA or SLH-DSA
   */
  async verify(req: Request, res: Response): Promise<void> {
    try {
      const { message, signature, publicKey, algorithm = 'ML-DSA-65' } = req.body;

      if (!message || !signature || !publicKey) {
        res.status(400).json({
          success: false,
          error: 'message, signature, and publicKey are required',
        });
        return;
      }

      const messageBytes = Buffer.from(message, 'base64');
      const signatureBytes = Buffer.from(signature, 'base64');
      const publicKeyBytes = Buffer.from(publicKey, 'base64');

      let isValid: boolean;

      if (algorithm === 'SLH-DSA-SHA2-256f') {
        isValid = await pqcService.verifySLHDSA(messageBytes, signatureBytes, publicKeyBytes);
      } else {
        isValid = await pqcService.verifyWithDSA(messageBytes, signatureBytes, publicKeyBytes, algorithm);
      }

      res.json({
        success: true,
        data: {
          valid: isValid,
          algorithm,
        },
        message: isValid ? 'Signature is valid' : 'Signature is invalid',
      });
    } catch (error) {
      logger.error('Verification failed', { error });
      res.status(500).json({
        success: false,
        error: 'Verification failed',
      });
    }
  }
}

export const pqcController = new PQCController();
