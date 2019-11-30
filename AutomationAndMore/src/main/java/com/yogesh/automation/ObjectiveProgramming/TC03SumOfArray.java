package com.yogesh.automation.ObjectiveProgramming;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.IntSummaryStatistics;
import java.util.List;
import java.util.stream.Collectors;

public class TC03SumOfArray {

	public static void main(String[] args) {
		// TODO Auto-generated method stub
		TC03SumOfArray obj = new TC03SumOfArray();
		Integer[] arr = { 5, 1, 4, 3, 2 };
		obj.sumOfArray(arr);
	}

	public void sumOfArray(Integer[] arr) {
		int sum = 0;
		for (int i : arr) {
			sum += i;
		}
		System.out.println("sum is " + sum);
		System.out.println("avg is " + sum / arr.length);

		int max = arr[0];
		for (int i : arr) {
			if (i > max) {
				max = i;
			}
		}
		System.out.println("max is " + max);

		// using collections
		ArrayList<Integer> al = new ArrayList<>();
		Collections.addAll(al, arr);

		// sum
		List<Integer> all = Arrays.asList(arr);
		IntSummaryStatistics stats = all.stream().collect(Collectors.summarizingInt(i -> i));
		System.out.println("getAverage " + stats.getAverage());
		System.out.println("getCount " + stats.getCount());
		System.out.println("getMax " + stats.getMax());
		System.out.println("getMin " + stats.getMin());
		System.out.println("getSum " + stats.getSum());
		System.out.println("getClass " + stats.getClass());
	}

}
