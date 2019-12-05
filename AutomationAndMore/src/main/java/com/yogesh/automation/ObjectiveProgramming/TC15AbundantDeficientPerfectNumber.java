package com.yogesh.automation.ObjectiveProgramming;

import java.util.ArrayList;
import java.util.Collections;
import java.util.stream.Collectors;

public class TC15AbundantDeficientPerfectNumber {

	public static void main(String[] args) {
		TC15AbundantDeficientPerfectNumber obj = new TC15AbundantDeficientPerfectNumber();
		obj.getnum();
	}

	public static void getnum() {
		ArrayList<Integer> list = new ArrayList<>();
		for (int i = 1; i <= 1000; i++) {

			for (int j = 1; j <= i/2; j++) {

				if (i % j == 0) {
					list.add(i / j);
				}
			}
			int sum = list.stream().collect(Collectors.summingInt(Integer::intValue));
			System.out.println(" sum " + sum);
			if (i - sum < 0) {

				System.out.println(i + " #Abundant " + list.stream().count());
			} else if (i - sum > 0) {
				System.out.println(i + " #Dificient" + list.stream().count());
			} else {
				System.out.println(i + " #Perfect" + list.stream().count());
			}
		}

	}

}
