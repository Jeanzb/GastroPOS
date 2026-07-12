import {
  CustomerDocumentType,
  FiscalInvoiceStatus,
  FiscalProviderType,
  PaymentMethod,
} from '../../../../generated/prisma';
import {
  buildFactusBillPayload,
  parseFactusNumberingRanges,
  parseFactusBillStatus,
  type FactusInvoiceRecord,
} from './factus.mapper';

const now = new Date('2026-01-01T00:00:00.000Z');

function invoice(overrides: Partial<FactusInvoiceRecord> = {}): FactusInvoiceRecord {
  const base = {
    id: 'invoice_1',
    tenantId: 'tenant_1',
    branchId: 'branch_1',
    fiscalProfileId: 'profile_1',
    saleId: 'sale_1',
    customerId: null,
    documentType: 'INVOICE',
    prefix: null,
    number: null,
    status: FiscalInvoiceStatus.READY_TO_SEND,
    customerDocumentType: null,
    customerDocumentNumber: null,
    customerName: 'Consumidor Final',
    customerEmail: null,
    customerPhone: null,
    customerAddress: null,
    customerMunicipality: null,
    subtotalAmount: 50000,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 50000,
    currency: 'COP',
    providerType: FiscalProviderType.TECHNOLOGY_PROVIDER,
    providerName: 'Factus',
    externalReference: null,
    referenceCode: null,
    numberingRangeId: 389,
    factusNumber: null,
    factusId: null,
    cufe: null,
    cude: null,
    qrUrl: null,
    publicUrl: null,
    xmlUrl: null,
    pdfUrl: null,
    pdfBase64: null,
    pdfFileName: null,
    xmlBase64: null,
    xmlFileName: null,
    attachedDocumentXmlBase64: null,
    attachedDocumentXmlFileName: null,
    providerPayload: null,
    rejectionPayload: null,
    isValidated: false,
    lastErrorCode: null,
    retryCount: 0,
    lastAttemptAt: null,
    nextRetryAt: null,
    sentAt: null,
    acceptedAt: null,
    validatedAt: null,
    rejectedAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdById: 'user_1',
    updatedById: null,
    fiscalProfile: {
      id: 'profile_1',
      tenantId: 'tenant_1',
      legalName: 'Restaurante Demo S.A.S.',
      nit: '900123456-7',
      taxRegime: null,
      fiscalResponsibilities: [],
      municipality: '11001',
      address: 'Cra 1 # 2-3',
      invoiceResolutionNumber: '18764000000001',
      invoiceResolutionPrefix: 'SETP',
      numberingRangeFrom: 1,
      numberingRangeTo: 5000,
      numberingValidFrom: now,
      numberingValidUntil: new Date('2027-01-01T00:00:00.000Z'),
      numberingRangeId: 389,
      isReady: true,
      createdAt: now,
      updatedAt: now,
      createdById: 'user_1',
      updatedById: null,
    },
    customer: null,
    sale: {
      id: 'sale_1',
      tenantId: 'tenant_1',
      branchId: 'branch_1',
      cashSessionId: null,
      diningTableId: null,
      customerId: null,
      fiscalDocumentId: 'invoice_1',
      status: 'CLOSED',
      fiscalStatus: FiscalInvoiceStatus.READY_TO_SEND,
      currency: 'COP',
      guestCount: null,
      waiterName: null,
      customerName: null,
      requiresInvoice: true,
      subtotal: 50000,
      discountTotal: 0,
      taxTotal: 0,
      tipAmount: 0,
      roundingAmount: 0,
      grandTotal: 50000,
      paidTotal: 50000,
      notes: null,
      cancelReason: null,
      createdById: 'user_1',
      closedById: 'user_1',
      closedAt: now,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
      payments: [
        {
          id: 'payment_1',
          tenantId: 'tenant_1',
          saleId: 'sale_1',
          method: PaymentMethod.CASH,
          amount: 50000,
          reference: null,
          factusPaymentMethodCode: null,
          paymentForm: 1,
          dueDate: null,
          acquirerReference: null,
          reconciledAt: null,
          createdById: 'user_1',
          createdAt: now,
        },
      ],
    },
    lines: [
      {
        id: 'line_1',
        tenantId: 'tenant_1',
        invoiceId: 'invoice_1',
        productId: 'product_1',
        codeReference: 'BURGER',
        description: 'Hamburguesa',
        quantity: 1,
        unitPriceAmount: 50000,
        grossUnitPriceAmount: 50000,
        factusPrice: '50000.00',
        discountAmount: 0,
        factusDiscountAmount: null,
        taxableAmount: 50000,
        subtotalAmount: 50000,
        taxAmount: 0,
        totalAmount: 50000,
        currency: 'COP',
        unitMeasureCode: '94',
        standardCode: '999',
        factusTaxCode: '01',
        taxRateBasisPoints: 0,
        isTaxExcluded: false,
        createdAt: now,
        updatedAt: now,
      },
    ],
    taxes: [],
  } as unknown as FactusInvoiceRecord;

  return { ...base, ...overrides } as FactusInvoiceRecord;
}

describe('Factus mapper', () => {
  it('maps Factus payment_form as string values for cash and credit payments', () => {
    const payload = buildFactusBillPayload(
      invoice({
        sale: {
          ...invoice().sale!,
          payments: [
            {
              ...invoice().sale!.payments[0],
              id: 'payment_cash',
              amount: 20000,
              paymentForm: 1,
            },
            {
              ...invoice().sale!.payments[0],
              id: 'payment_credit',
              method: PaymentMethod.TRANSFER,
              amount: 30000,
              paymentForm: 2,
              dueDate: new Date('2026-01-10T00:00:00.000Z'),
            },
          ],
        },
      }),
    );

    expect(payload.payment_details).toEqual([
      expect.objectContaining({ payment_form: '1', amount: '20000.00' }),
      expect.objectContaining({ payment_form: '2', amount: '30000.00', due_date: '2026-01-10' }),
    ]);
  });

  it('maps anonymous restaurant sales to consumidor final without fiscal customer data', () => {
    const payload = buildFactusBillPayload(invoice());

    expect(payload.customer).toEqual({
      identification_document_code: '13',
      identification: '222222222222',
      legal_organization_code: '2',
      tribute_code: 'ZZ',
      names: 'Consumidor Final',
      country_code: 'CO',
    });
  });

  it('maps voluntary tips as a surcharge allowance charge separate from items', () => {
    const payload = buildFactusBillPayload(
      invoice({
        sale: {
          ...invoice().sale!,
          tipAmount: 5000,
        },
      }),
    );

    expect(payload.allowance_charges).toEqual([
      {
        concept_type: '03',
        is_surcharge: true,
        reason: 'propina',
        base_amount: '50000.00',
        amount: '5000.00',
      },
    ]);
  });

  it('maps identified NIT customers with separated verification digit', () => {
    const payload = buildFactusBillPayload(
      invoice({
        customerDocumentNumber: '900123456-7',
        customerName: 'Restaurante Cliente S.A.S.',
        customer: {
          id: 'customer_1',
          tenantId: 'tenant_1',
          documentType: CustomerDocumentType.NIT,
          documentNumber: '900123456-7',
          dv: '7',
          factusIdentificationCode: null,
          legalOrganizationCode: '1',
          company: 'Restaurante Cliente S.A.S.',
          names: null,
          name: 'Restaurante Cliente S.A.S.',
          email: 'cliente@example.com',
          phone: null,
          address: 'Calle 10 # 1-2',
          countryCode: 'CO',
          municipality: 'Bogota',
          municipalityCode: '11001',
          tributeCode: '01',
          taxResponsibility: null,
          taxResponsibilities: [],
          isActive: true,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          createdById: 'user_1',
          updatedById: null,
        },
      }),
    );

    expect(payload.customer).toEqual(
      expect.objectContaining({
        identification_document_code: '31',
        identification: '900123456',
        dv: '7',
        company: 'Restaurante Cliente S.A.S.',
        country_code: 'CO',
        municipality_code: '11001',
      }),
    );
  });

  it('maps line-level INC tax and net Factus unit price', () => {
    const payload = buildFactusBillPayload(
      invoice({
        subtotalAmount: 10000,
        taxAmount: 800,
        totalAmount: 10800,
        sale: {
          ...invoice().sale!,
          subtotal: 10800,
          grandTotal: 10800,
          paidTotal: 10800,
          payments: [
            {
              ...invoice().sale!.payments[0],
              amount: 10800,
              factusPaymentMethodCode: '48',
            },
          ],
        },
        lines: [
          {
            ...invoice().lines[0],
            description: 'Menu restaurante',
            unitPriceAmount: 10000,
            grossUnitPriceAmount: 10800,
            factusPrice: '10000.00',
            taxableAmount: 10000,
            subtotalAmount: 10000,
            taxAmount: 800,
            totalAmount: 10800,
            factusTaxCode: '04',
            taxRateBasisPoints: 800,
          },
        ],
        taxes: [
          {
            id: 'tax_1',
            tenantId: 'tenant_1',
            invoiceId: 'invoice_1',
            taxName: 'INC',
            factusTaxCode: '04',
            taxRateBasisPoints: 800,
            taxableAmount: 10000,
            taxAmount: 800,
            isTaxExcluded: false,
            createdAt: now,
          },
        ],
      }),
    );

    expect(payload.items[0]).toEqual(
      expect.objectContaining({
        name: 'Menu restaurante',
        price: '10000.00',
        taxes: [{ code: '04', rate: '8.00' }],
      }),
    );
    expect(payload.payment_details[0]).toEqual(
      expect.objectContaining({ payment_method_code: '48', amount: '10800.00' }),
    );
  });

  it('parses a successful Factus V2 response with Created status and data links', () => {
    const status = parseFactusBillStatus({
      status: 'Created',
      data: {
        id: 123,
        number: 'SETP990000550',
        is_validated: true,
        validated_at: '01-01-2026 03:45:10 PM',
        cufe: 'CUFE123',
        errors: {
          RUT01: 'Regla: RUT01, Notificacion informativa',
        },
        links: {
          qr: 'https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=CUFE123',
          public_url: 'https://api.factus.com.co/bill/show/SETP990000550',
        },
      },
    });

    expect(status).toEqual(
      expect.objectContaining({
        isAccepted: true,
        isRejected: false,
        isValidated: true,
        number: 'SETP990000550',
        cufe: 'CUFE123',
        qrUrl: 'https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=CUFE123',
        publicUrl: 'https://api.factus.com.co/bill/show/SETP990000550',
      }),
    );
    expect(status.validatedAt?.toISOString()).toBe('2026-01-01T15:45:10.000Z');
  });

  it('treats non-validated responses as rejected only when errors contain rejection text', () => {
    expect(
      parseFactusBillStatus({
        data: { is_validated: false, errors: {} },
      }),
    ).toEqual(expect.objectContaining({ isRejected: false }));

    expect(
      parseFactusBillStatus({
        data: {
          is_validated: false,
          errors: { FAJ43b: 'Regla: FAJ43b, Rechazo: valor invalido' },
        },
      }),
    ).toEqual(expect.objectContaining({ isRejected: true }));
  });

  it('normalizes Factus range envelopes and ignores duplicate or malformed ranges', () => {
    const ranges = parseFactusNumberingRanges({
      data: {
        numbering_ranges: [
          {
            numbering_range_id: '389',
            document_type: '01',
            prefix: 'SETP',
            resolution: '18764000000001',
            range_from: '1',
            range_to: '5000',
            current_number: '42',
            date_from: '2026-01-01',
            expiration_date: '2027-01-01',
            active: true,
          },
          { id: 389, prefix: 'DUPLICADO' },
          { prefix: 'SIN-ID' },
        ],
      },
    });

    expect(ranges).toEqual([
      expect.objectContaining({
        id: 389,
        document: '01',
        prefix: 'SETP',
        resolutionNumber: '18764000000001',
        rangeFrom: 1,
        rangeTo: 5000,
        current: 42,
        isActive: true,
      }),
    ]);
    expect(ranges[0]?.validUntil).toBe('2027-01-01T00:00:00.000Z');
  });
});
