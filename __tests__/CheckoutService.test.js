import { CheckoutService } from '../src/services/CheckoutService.js';
import { UserMother } from './builders/UserMother.js';
import { CarrinhoBuilder } from './builders/CarrinhoBuilder.js';
import { Item } from '../src/domain/Item.js';
import { Pedido } from '../src/domain/Pedido.js';

describe('CheckoutService', () => {
    describe('quando o pagamento falha', () => {
        it('deve retornar null quando o GatewayPagamento recusar a cobrança', async () => {
            const carrinho = new CarrinhoBuilder()
                .comValorTotal(200)
                .build();

            const gatewayStub = {
                cobrar: jest.fn().mockResolvedValue({ success: false })
            };

            const repositoryDummy = {
                salvar: jest.fn()
            };

            const emailDummy = {
                enviarEmail: jest.fn()
            };

            const checkoutService = new CheckoutService(
                gatewayStub,
                repositoryDummy,
                emailDummy
            );

            const cartaoCredito = { numero: '1234-5678-9012-3456' };

            const pedido = await checkoutService.processarPedido(carrinho, cartaoCredito);

            expect(pedido).toBeNull();
            expect(gatewayStub.cobrar).toHaveBeenCalledTimes(1);
            expect(repositoryDummy.salvar).not.toHaveBeenCalled();
            expect(emailDummy.enviarEmail).not.toHaveBeenCalled();
        });
    });

    describe('quando um cliente Premium finaliza a compra', () => {
        it('deve aplicar desconto de 10% e enviar e-mail de confirmação', async () => {
            const usuarioPremium = UserMother.umUsuarioPremium();
            const carrinho = new CarrinhoBuilder()
                .comUser(usuarioPremium)
                .comValorTotal(200)
                .build();

            const gatewayStub = {
                cobrar: jest.fn().mockResolvedValue({ success: true })
            };

            const pedidoSalvo = new Pedido(123, carrinho, 180, 'PROCESSADO');
            const repositoryStub = {
                salvar: jest.fn().mockResolvedValue(pedidoSalvo)
            };

            const emailMock = {
                enviarEmail: jest.fn().mockResolvedValue(undefined)
            };

            const checkoutService = new CheckoutService(
                gatewayStub,
                repositoryStub,
                emailMock
            );

            const cartaoCredito = { numero: '1234-5678-9012-3456' };

            const resultado = await checkoutService.processarPedido(carrinho, cartaoCredito);

            expect(gatewayStub.cobrar).toHaveBeenCalledWith(180, cartaoCredito);
            expect(gatewayStub.cobrar).toHaveBeenCalledTimes(1);

            expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
            expect(emailMock.enviarEmail).toHaveBeenCalledWith(
                'premium@email.com',
                'Seu Pedido foi Aprovado!',
                'Pedido 123 no valor de R$180'
            );

            expect(repositoryStub.salvar).toHaveBeenCalledTimes(1);
            expect(resultado).toEqual(pedidoSalvo);
        });
    });

    describe('quando um cliente padrão finaliza a compra', () => {
        it('deve processar o pedido sem desconto', async () => {
            const carrinho = new CarrinhoBuilder()
                .comValorTotal(200)
                .build();

            const gatewayStub = {
                cobrar: jest.fn().mockResolvedValue({ success: true })
            };

            const pedidoSalvo = new Pedido(456, carrinho, 200, 'PROCESSADO');
            const repositoryStub = {
                salvar: jest.fn().mockResolvedValue(pedidoSalvo)
            };

            const emailMock = {
                enviarEmail: jest.fn().mockResolvedValue(undefined)
            };

            const checkoutService = new CheckoutService(
                gatewayStub,
                repositoryStub,
                emailMock
            );

            const cartaoCredito = { numero: '1234-5678-9012-3456' };

            const resultado = await checkoutService.processarPedido(carrinho, cartaoCredito);

            expect(gatewayStub.cobrar).toHaveBeenCalledWith(200, cartaoCredito);
            expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
            expect(resultado).toEqual(pedidoSalvo);
        });
    });
});

