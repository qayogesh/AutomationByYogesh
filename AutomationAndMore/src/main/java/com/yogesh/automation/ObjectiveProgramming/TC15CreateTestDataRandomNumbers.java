package com.yogesh.automation.ObjectiveProgramming;

import java.util.Random;

public class TC15CreateTestDataRandomNumbers {

	public static void main(String[] args) {
		Random r = new Random();
		for (int i = 0; i < 1000; i++) {
			System.out.println(r.nextInt(10000));
		}
	}

}
