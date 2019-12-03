package com.yogesh.automation.ObjectiveProgramming;

public class TC11ComputeInvestment {

	public static void main(String[] args) {
		TC11ComputeInvestment obj = new TC11ComputeInvestment();
		obj.computeInvestment(1000, 10, 5);
	}

	public void computeInvestment(int amt, double rateOfInt, int years) {
		double returns = 0;
		for (int i = 1; i < years; i++) {
			returns = (double) (amt + (amt * i * rateOfInt / 100));
			System.out.println(
					"Returns #" + returns + "# on amount " + amt + " Interest " + rateOfInt + " for years " + i);
			returns =0;
		}
	}

}
